import os
from datetime import timedelta
from minio import Minio
from uuid import uuid4


class FileUploadService:
    """
    Service for uploading files to MinIO (local S3-compatible storage).
    Handles credential files (degrees, licenses, etc.) for counselors and therapists.
    """

    def __init__(self):
        """Initialize MinIO client with credentials from environment variables."""
        self.endpoint = os.getenv('MINIO_ENDPOINT', 'minio:9000')
        self.access_key = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
        self.secret_key = os.getenv('MINIO_SECRET_KEY', 'minioadmin')
        self.bucket = os.getenv('MINIO_BUCKET', 'seeker-local')
        self.secure = os.getenv('MINIO_SECURE', 'False').lower() == 'true'

        self.client = Minio(
            self.endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=self.secure
        )

    def ensure_bucket_exists(self):
        """Create bucket if it doesn't exist."""
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
        except Exception as e:
            raise Exception(f"Failed to create bucket: {str(e)}")

    def upload_file(self, file_obj, folder, filename):
        """
        Upload a file to MinIO.

        Args:
            file_obj: File object with .read() and .size attributes
            folder: Subdirectory in bucket (e.g., 'counselor_credentials')
            filename: Original filename

        Returns:
            str: MinIO path in format 'minio://bucket/folder/uuid/filename'

        Raises:
            Exception: If upload fails
        """
        try:
            self.ensure_bucket_exists()

            # Generate unique path: folder/uuid/filename
            object_name = f"{folder}/{uuid4()}/{filename}"

            # Upload to MinIO
            self.client.put_object(
                self.bucket,
                object_name,
                file_obj.read(),
                length=file_obj.size,
                content_type=getattr(file_obj, 'content_type', 'application/octet-stream')
            )

            # Return MinIO path
            return f"minio://{self.bucket}/{object_name}"

        except Exception as e:
            raise Exception(f"File upload failed: {str(e)}")

    def get_file_url(self, minio_path):
        """
        Get a public URL for a file in MinIO.

        Args:
            minio_path: MinIO path (format: 'minio://bucket/folder/uuid/filename')

        Returns:
            str: HTTP URL to access the file

        Raises:
            Exception: If URL generation fails
        """
        try:
            # Parse MinIO path
            if not minio_path.startswith('minio://'):
                raise ValueError("Invalid MinIO path format")

            # Extract object name from path
            # Format: minio://bucket/object_name
            path_parts = minio_path.replace('minio://', '').split('/', 1)
            if len(path_parts) < 2:
                raise ValueError("Invalid MinIO path format")

            bucket = path_parts[0]
            object_name = path_parts[1]

            # Generate presigned URL (valid for 7 days)
            url = self.client.get_presigned_download_url(
                bucket,
                object_name,
                expires=timedelta(days=7)
            )
            return url

        except Exception as e:
            raise Exception(f"Failed to generate file URL: {str(e)}")
