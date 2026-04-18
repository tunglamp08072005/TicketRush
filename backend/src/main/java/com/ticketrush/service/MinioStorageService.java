package com.ticketrush.service;

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

    @Value("${app.local-storage.upload-dir:uploads}")
    private String localUploadDir;

    @Value("${app.server.public-base-url:http://localhost:8080}")
    private String appServerPublicBaseUrl;

    private volatile boolean minioReady;
    private Path localPosterDirectory;

    public MinioStorageService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    @PostConstruct
    public void ensureBucket() {
        initializeLocalStorage();

        if (!minioEnabled) {
            log.info("MinIO is disabled by configuration (app.minio.enabled=false)");
            minioReady = false;
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
            log.warn("Cannot initialize MinIO bucket at startup. Event upload will be unavailable until MinIO is reachable.", ex);
        }
    }

    public String uploadPoster(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Poster file is required");
        }

        String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
        if (!contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }

        String extension = resolveExtension(file.getOriginalFilename(), contentType);
        String objectName = "poster-" + Instant.now().toEpochMilli() + "-" + UUID.randomUUID() + extension;

        if (!minioEnabled || !minioReady) {
            return uploadPosterLocally(file, objectName);
        }

        String minioObjectName = "posters/" + objectName;

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
            throw new IllegalStateException("Cannot upload poster to MinIO", ex);
        }
    }

    private void initializeLocalStorage() {
        try {
            localPosterDirectory = Paths.get(localUploadDir, "posters").toAbsolutePath().normalize();
            Files.createDirectories(localPosterDirectory);
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot initialize local poster storage", ex);
        }
    }

    private String uploadPosterLocally(MultipartFile file, String fileName) {
        try (InputStream inputStream = file.getInputStream()) {
            Path targetFile = localPosterDirectory.resolve(fileName).normalize();
            Files.copy(inputStream, targetFile, StandardCopyOption.REPLACE_EXISTING);
            return buildLocalPublicUrl("posters/" + fileName);
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot upload poster to local storage", ex);
        }
    }

    private String buildPublicUrl(String objectName) {
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        return base + "/" + bucket + "/" + objectName;
    }

    private String buildLocalPublicUrl(String relativePath) {
        String base = appServerPublicBaseUrl.endsWith("/")
                ? appServerPublicBaseUrl.substring(0, appServerPublicBaseUrl.length() - 1)
                : appServerPublicBaseUrl;
        return base + "/uploads/" + relativePath;
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
