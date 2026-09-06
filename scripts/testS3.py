#!/usr/bin/env python3
import argparse
import os
import sys
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

def build_client(endpoint, access_key, secret_key, region):
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region,
        config=Config(
            s3={"addressing_style": "path"},
            signature_version="s3v4"
        ),
    )

def print_menu():
    print("\n=== S3 Menu ===")
    print("1) Upload file")
    print("2) Download file")
    print("3) List objects")
    print("4) Head object")
    print("5) Delete object")
    print("6) Update credentials")
    print("7) Test all operations")
    print("0) Exit")

def input_nonempty(prompt):
    value = input(prompt).strip()
    if not value:
        print("Value cannot be empty.")
        raise SystemExit(1)
    return value

def upload_file(client, bucket, file_path, object_key=None):
    p = Path(file_path)
    if not p.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    key = object_key or p.name
    with open(p, "rb") as f:
        resp = client.put_object(Bucket=bucket, Key=key, Body=f)
    print(f"Upload successful: Bucket={bucket}, Key={key}")
    print(resp)

def download_file(client, bucket, object_key, save_path):
    resp = client.get_object(Bucket=bucket, Key=object_key)
    data = resp["Body"].read()
    Path(save_path).write_bytes(data)
    print(f"Downloaded successfully: {object_key} -> {save_path}")
    print(f"Bytes: {len(data)}")

def list_objects(client, bucket):
    resp = client.list_objects_v2(Bucket=bucket)
    contents = resp.get("Contents", [])
    if not contents:
        print(f"No objects found in bucket: {bucket}")
        return
    print(f"Objects in {bucket}:")
    for obj in contents:
        print(" -", obj["Key"])

def head_object(client, bucket, object_key):
    resp = client.head_object(Bucket=bucket, Key=object_key)
    print(f"Head result for {object_key}:")
    print(resp)

def delete_object(client, bucket, object_key):
    resp = client.delete_object(Bucket=bucket, Key=object_key)
    print(f"Deleted: Bucket={bucket}, Key={object_key}")
    print(resp)

def test_all(client, bucket, file_path):
    key = Path(file_path).name
    print("\n[1/4] Uploading file...")
    upload_file(client, bucket, file_path, key)

    print("\n[2/4] Checking object metadata...")
    head_object(client, bucket, key)

    print("\n[3/4] Listing objects...")
    list_objects(client, bucket)

    print("\n[4/4] Deleting object...")
    delete_object(client, bucket, key)

    print("\nAll S3 operations completed.")
    print("If delete worked, the object is removed from the bucket.")

def update_credentials(args):
    print("\nUpdate credentials:")
    new_access = input_nonempty("New access key: ")
    new_secret = input_nonempty("New secret key: ")
    args.access_key = new_access
    args.secret_key = new_secret
    print("Credentials updated in memory.")
    return build_client(args.endpoint, args.access_key, args.secret_key, args.region)

def parse_args():
    parser = argparse.ArgumentParser(description="Simple S3 CLI test menu")
    parser.add_argument("--endpoint", required=True, help="S3 endpoint, e.g. http://localhost:3000/s3")
    parser.add_argument("--bucket", required=True, help="Bucket name")
    parser.add_argument("--access-key", required=True, help="S3 access key")
    parser.add_argument("--secret-key", required=True, help="S3 secret key")
    parser.add_argument("--region", default="us-east-1", help="AWS/S3 region")
    parser.add_argument("--file", help="File path for upload/download operations")
    parser.add_argument("--key", help="Object key to use for upload / get / delete")
    return parser.parse_args()

def main():
    args = parse_args()
    client = build_client(args.endpoint, args.access_key, args.secret_key, args.region)

    while True:
        print_menu()
        try:
            choice = input("\nChoose an option: ").strip()
        except EOFError:
            print("\nExiting.")
            break

        if choice == "0":
            print("Bye.")
            break

        try:
            if choice == "1":
                if not args.file:
                    args.file = input_nonempty("Enter full file path to upload: ")
                upload_file(client, args.bucket, args.file, args.key)
            elif choice == "2":
                if not args.file:
                    args.file = input_nonempty("Enter full path to save downloaded file: ")
                obj_key = args.key or input_nonempty("Object key to download: ")
                download_file(client, args.bucket, obj_key, args.file)
            elif choice == "3":
                list_objects(client, args.bucket)
            elif choice == "4":
                obj_key = args.key or input_nonempty("Object key to check: ")
                head_object(client, args.bucket, obj_key)
            elif choice == "5":
                obj_key = args.key or input_nonempty("Object key to delete: ")
                delete_object(client, args.bucket, obj_key)
            elif choice == "6":
                client = update_credentials(args)
            elif choice == "7":
                if not args.file:
                    args.file = input_nonempty("Enter file path for test upload: ")
                test_all(client, args.bucket, args.file)
            else:
                print("Invalid option. Please choose 1-7 or 0.")
        except FileNotFoundError as e:
            print(f"File error: {e}")
        except ClientError as e:
            print("S3 request failed:")
            print(e)
        except Exception as e:
            print(f"Unexpected error: {e}")

if __name__ == "__main__":
    main()