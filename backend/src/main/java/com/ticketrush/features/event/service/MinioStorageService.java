package com.ticketrush.features.event.service;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.SetBucketPolicyArgs;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class MinioStorageService {

    private static final Logger log = LoggerFactory.getLogger(MinioStorageService.class);

    private final MinioClient minioClient;

    @Value("${app.minio.enabled:false}")
    private boolean minioEnabled;

    @Value("${app.minio.bucket}")
    private String bucket;

    @Value("${app.minio.public-base-url}")
    private String publicBaseUrl;

    @Value("${app.local-upload.root:backend/storage}")
    private String localUploadRoot;

    @Value("${app.local-upload.public-base-url:http://localhost:${server.port}}")
    private String localUploadPublicBaseUrl;

    private volatile boolean minioReady;

    public MinioStorageService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    @PostConstruct
    public void ensureBucket() {
        if (!minioEnabled) {
            minioReady = false;
            log.info("MinIO is disabled via app.minio.enabled=false. Upload endpoints will be unavailable.");
            return;
        }

        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            }

            // Allow public read for object URLs so frontend can render images directly.
            String policy = """
                    {
                      \"Version\":\"2012-10-17\",
                      \"Statement\":[
                        {
                          \"Effect\":\"Allow\",
                          \"Principal\":{\"AWS\":[\"*\"]},
                          \"Action\":[\"s3:GetObject\"],
                          \"Resource\":[\"arn:aws:s3:::%s/*\"]
                        }
                      ]
                    }
                    """.formatted(bucket);
            minioClient.setBucketPolicy(SetBucketPolicyArgs.builder().bucket(bucket).config(policy).build());
            minioReady = true;
            log.info("MinIO bucket '{}' is ready", bucket);
        } catch (Exception ex) {
            minioReady = false;
            throw new IllegalStateException("Cannot initialize MinIO bucket at startup. Please verify MinIO endpoint and credentials.", ex);
        }
    }

    public String uploadPoster(MultipartFile file) {
        return uploadImage(file, "posters", "poster", "Poster");
    }

    public String uploadLayoutMap(MultipartFile file) {
        return uploadImage(file, "layout-maps", "layout-map", "Layout map");
    }

    public String uploadPaymentProof(MultipartFile file) {
        return uploadImage(file, "payment-proofs", "payment-proof", "Payment proof");
    }

    public String uploadAvatar(MultipartFile file) {
        return uploadImage(file, "avatars", "avatar", "Avatar");
    }

    private String uploadImage(MultipartFile file, String folder, String filePrefix, String fieldLabel) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(fieldLabel + " file is required");
        }

        String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
        if (!contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }

        String extension = resolveExtension(file.getOriginalFilename(), contentType);
        String objectName = filePrefix + "-" + Instant.now().toEpochMilli() + "-" + UUID.randomUUID() + extension;

        if (!minioEnabled) {
            return saveImageLocally(file, folder, objectName, fieldLabel);
        }

        if (!minioReady) {
            throw new IllegalStateException("MinIO is not ready. Please ensure MinIO is running and accessible.");
        }

        String minioObjectName = folder + "/" + objectName;

        try (InputStream inputStream = file.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(minioObjectName)
                            .stream(inputStream, file.getSize(), -1)
                            .contentType(contentType)
                            .build()
            );
            return buildPublicUrl(minioObjectName);
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot upload " + fieldLabel.toLowerCase() + " to MinIO", ex);
        }
    }

    private String saveImageLocally(MultipartFile file, String folder, String objectName, String fieldLabel) {
        try {
            Path rootPath = Paths.get(localUploadRoot).toAbsolutePath().normalize();
            Path folderPath = rootPath.resolve(folder).normalize();
            Path targetPath = folderPath.resolve(objectName).normalize();

            if (!targetPath.startsWith(rootPath)) {
                throw new IllegalStateException("Resolved local upload path is outside the storage root");
            }

            Files.createDirectories(folderPath);

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }

            return buildLocalUploadUrl(folder, objectName);
        } catch (IOException ex) {
            throw new IllegalStateException("Cannot save " + fieldLabel.toLowerCase() + " to local storage", ex);
        }
    }

    private String buildPublicUrl(String objectName) {
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        return base + "/" + bucket + "/" + objectName;
    }

    private String buildLocalUploadUrl(String folder, String objectName) {
        String base = localUploadPublicBaseUrl.endsWith("/")
                ? localUploadPublicBaseUrl.substring(0, localUploadPublicBaseUrl.length() - 1)
                : localUploadPublicBaseUrl;
        return base + "/api/uploads/" + folder + "/" + objectName;
    }

    private String resolveExtension(String fileName, String contentType) {
        if (fileName != null) {
            int index = fileName.lastIndexOf('.');
            if (index > -1 && index < fileName.length() - 1) {
                return fileName.substring(index).toLowerCase();
            }
        }

        Map<String, String> byContentType = Map.of(
                "image/jpeg", ".jpg",
                "image/png", ".png",
                "image/webp", ".webp",
                "image/gif", ".gif"
        );
        return byContentType.getOrDefault(contentType, ".img");
    }
}
