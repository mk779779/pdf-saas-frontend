import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from "@aws-sdk/client-s3";

const s3Client: S3Client = new S3Client({
  region: "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY_ID,
  },
});

export async function uploadToS3(
  file: File
): Promise<{ fileKey: string; fileName: string }> {
  const fileKey: string = `uploads/${Date.now().toString()}${file.name.replace(
    " ",
    "-"
  )}`;
  const fileSize: number = file.size;
  const chunkSize: number = 10 * 1024 * 1024; // 10 MB
  const numChunks: number = Math.ceil(fileSize / chunkSize);

  if (fileSize <= chunkSize) {
    // Upload file in a single chunk
    const params: PutObjectCommandInput = {
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: fileKey,
      Body: file,
    };
    const command: PutObjectCommand = new PutObjectCommand(params);
    const response: PutObjectOutput = await s3Client.send(command);
    log("successfully uploaded to S3!", fileKey);
    return { fileKey, fileName: file.name };
  } else {
    // Upload file in multiple chunks using multipart upload
    const multipartUploadId: string = await createMultipartUpload(fileKey);
    const chunkPromises: Promise[] = [];
    for (let i = 0; i < numChunks; i++) {
      const chunkStart: number = i * chunkSize;
      const chunkEnd: number = Math.min(fileSize, (i + 1) * chunkSize);
      const chunk: Uint8Array = file.slice(chunkStart, chunkEnd);
      const chunkParams: UploadPartCommandInput = {
        Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
        Key: fileKey,
        PartNumber: i + 1,
        UploadId: multipartUploadId,
        Body: chunk,
      };
      const chunkCommand: UploadPartCommand = new UploadPartCommand(
        chunkParams
      );
      chunkPromises.push(s3Client.send(chunkCommand));
    }

    // Monitor progress
    const progress: {
      totalChunks: number;
      uploadedChunks: number;
      failedChunks: number;
    } = {
      totalChunks: numChunks,
      uploadedChunks: 0,
      failedChunks: 0,
    };

    await Promise.all(
      chunkPromises.map((promise, index) => {
        return promise
          .then(() => {
            progress.uploadedChunks++;
            console.log(`Uploaded chunk ${index + 1} of ${numChunks}`);
          })
          .catch((error) => {
            progress.failedChunks++;
            console.error(
              `Failed to upload chunk ${index + 1}: ${error.message}`
            );
          });
      })
    );

    if (progress.failedChunks > 0) {
      console.error(`Failed to upload ${progress.failedChunks} chunks`);
    }

    await completeMultipartUpload(fileKey, multipartUploadId);
    console.log("successfully uploaded to S3 in multiple chunks!", fileKey);
    return { fileKey, fileName: file.name };
  }
}

async function createMultipartUpload(fileKey: string): Promise {
  const params: CreateMultipartUploadCommandInput = {
    Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
    Key: fileKey,
  };
  const command: CreateMultipartUploadCommand =
    new CreateMultipartUploadCommand(params);
  const response: CreateMultipartUploadOutput = await s3Client.send(command);
  return response.UploadId!;
}

async function completeMultipartUpload(
  fileKey: string,
  multipartUploadId: string
): Promise {
  const params: CompleteMultipartUploadCommandInput = {
    Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
    Key: fileKey,
    MultipartUpload: {
      Parts: [
        {
          PartNumber: 1,
          ETag: "etag1",
        },
        {
          PartNumber: 2,
          ETag: "etag2",
        },
        // ...
      ],
    },
    UploadId: multipartUploadId,
  };
  const command: CompleteMultipartUploadCommand =
    new CompleteMultipartUploadCommand(params);
  await s3Client.send(command);
}
