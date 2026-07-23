# S3Forge

An open-source, self-hosted platform for managing S3-compatible object storage, powered by [MinIO](https://www.min.io/).

## Goals

The goal of this project is to provide a platform for managing:

* User accounts
* S3-compatible object storage
* Storage credentials
* Buckets
* Access policies
* Storage usage and quotas

## Technology

The project is being built with:

* [TypeScript](https://www.typescriptlang.org/)
* [Node.js](https://nodejs.org/)
* [Express](https://expressjs.com/)
* [React](https://react.dev/)
* [Vite](https://vite.dev/)
* [PostgreSQL](https://www.postgresql.org/)
* [MinIO](https://www.min.io/)
* [Caddy](https://caddyserver.com/)

## Development

Development setup instructions will be added as the project evolves.

## High-Level Architecture

```text
                         Internet
                            │
                            ▼
                          Caddy
                     Reverse Proxy + TLS
                      /              \
                     /                \
                    ▼                  ▼
             React + Vite          Express API
             Dashboard             TypeScript
                                       │
                              ┌────────┴────────┐
                              │                 │
                              ▼                 ▼
                         PostgreSQL           MinIO
                         ──────────           ─────
                         Users                Buckets
                         Sessions             Objects
                         Credentials          S3 API
                         Quotas
                         Metadata
```

## MinIO Acknowledgement

This project uses [MinIO](https://www.min.io/) as an S3-compatible object storage backend.

MinIO is developed by MinIO, Inc. and is available under its respective licensing terms. Please refer to the [MinIO GitHub repository](https://github.com/minio/minio) for source code and licensing information.

This project is an independent project and is not affiliated with, sponsored by, or endorsed by MinIO, Inc.

For more information, visit the [official MinIO website](https://www.min.io/).

## License

A license for S3Forge has not been selected yet.

Third-party software and dependencies used by this project remain subject to their respective licenses. See the [MinIO project](https://github.com/minio/minio) for licensing information applicable to MinIO.
