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

    private volatile boolean minioReady;

    public MinioStorageService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    @PostConstruct
    public void ensureBucket() {
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
        if (!minioEnabled) {
            throw new IllegalStateException("MinIO is disabled. Set APP_MINIO_ENABLED=true to upload posters");
        }

        if (!minioReady) {
            throw new IllegalStateException("MinIO is not ready. Please start MinIO container and retry");
        }

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Poster file is required");
        }

        String contentType = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
        if (!contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }

        String extension = resolveExtension(file.getOriginalFilename(), contentType);
        String objectName = "posters/poster-" + Instant.now().toEpochMilli() + "-" + UUID.randomUUID() + extension;

        try (InputStream inputStream = file.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .stream(inputStream, file.getSize(), -1)
                            .contentType(contentType)
                            .build()
            );
            return buildPublicUrl(objectName);
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot upload poster to MinIO", ex);
        }
    }

    private String buildPublicUrl(String objectName) {
        String base = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
        return base + "/" + bucket + "/" + objectName;
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
