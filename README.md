Here’s the updated `README.md` with the requested changes, including the development status and the removal of code examples:

---

# NestJS HyperExpress Platform (In Development)

[![GitHub Stars](https://img.shields.io/github/stars/zenofolio/nestjs-hyper-express-platform.svg)](https://github.com/zenofolio/nestjs-hyper-express-platform/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/zenofolio/nestjs-hyper-express-platform.svg)](https://github.com/zenofolio/nestjs-hyper-express-platform/issues)
![Project Status](https://img.shields.io/badge/status-development-yellow.svg)

This project provides an **adapter** for using the high-performance [HyperExpress](https://github.com/kartikk221/hyper-express) framework as the platform driver for a [NestJS](https://nestjs.com) application. It allows you to benefit from HyperExpress' ultra-fast server while keeping all the benefits of the NestJS framework.

> **Status:** This package is currently in **development** and not available on npm yet. You can clone the repository and test it locally.

## Features

- Use HyperExpress as the HTTP server for your NestJS project, optimizing performance.
- Support for both HTTP and WebSocket connections.
- Lightweight and optimized for high concurrency and low memory consumption.
- Compatible with NestJS middleware and dependency injection.

## Installation

Since this package is still under development, you can install it directly from the repository:

```bash
# Clone the repository
git clone https://github.com/zenofolio/nestjs-hyper-express-platform.git

# Install dependencies
cd nestjs-hyper-express-platform
npm install
```

## Example

There is an example included in this repository that demonstrates how to use the adapter. To run the example:

```bash
cd example
npm install
npm run start
```

## Roadmap

- [ ] Full support for NestJS features (guards, interceptors, etc.).
- [ ] Optimizations for WebSocket connections.
- [ ] Publish the package to npm.
- [ ] Detailed documentation on configuration and usage.

## Contributing

Contributions are welcome! Feel free to create issues or submit pull requests to help improve this adapter. Check out the [issues section](https://github.com/zenofolio/nestjs-hyper-express-platform/issues) for more information.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

This version reflects the development status and provides basic instructions without code examples. Let me know if you'd like any further adjustments!