import type { CorsOptions, CorsOptionsDelegate } from "@nestjs/common/interfaces/external/cors-options.interface";
import { Request, Response, MiddlewareHandler, MiddlewareNext } from "hyper-express/types";

// Default CORS options configuration
const defaultCorsConfig: CorsOptions = {
  origin: "*", // Allow all origins by default
  methods: "*", // Allow all HTTP methods
  preflightContinue: false, // Do not continue preflight requests
  optionsSuccessStatus: 204, // Status code for successful preflight responses
  credentials: false, // Do not allow credentials by default
  exposedHeaders: null, // No exposed headers by default
  allowedHeaders: "*", // Allow all headers by default
  maxAge: null, // No max age specified by default
};

/**
 * CORS Middleware Handler
 * @param corsConfig - The CORS options or a delegate that dynamically provides CORS options
 * @returns MiddlewareHandler - A middleware function that handles CORS requests
 */
export function applyCors<TRequest extends Request>(
  corsConfig: CorsOptions | CorsOptionsDelegate<TRequest>
): MiddlewareHandler {
  
  return (req: TRequest, res: Response, next: () => void) => {
    const requestMethod = req.method?.toLowerCase(); // Get the HTTP method
    const requestOrigin = req.headers["origin"] || ""; // Get the request origin

    // Function to configure CORS headers based on the provided options
    const configure = (corsConfig: CorsOptions, next: MiddlewareNext) => {
      configureCorsHeaders(req, res, corsConfig); // Apply static CORS options

      // Handle preflight requests for OPTIONS method
      if (requestMethod === "options" && !corsConfig.preflightContinue) {
        res.status(corsConfig.optionsSuccessStatus ?? 200).send();
        return;
      }

      // Check if the request origin is allowed
      IsAllowedOrigin(corsConfig.origin, requestOrigin)
        .then((isAllowed) => {
          if (isAllowed) {
            setOriginHeader(res, "*"); // Allow all origins
          } else {
            setOriginHeader(res, corsConfig.origin); // Use configured origin
          }
          next();
        })
        .catch((err) => {
          return next(err);
        });
    };

    // If corsConfig is a function (delegate), use it to get dynamic CORS options
    if (typeof corsConfig === "function") {
      corsConfig(req, (err, resolvedCorsConfig) => {
        if (err) {
          return next(); // If there's an error, skip CORS
        }
        configure(resolvedCorsConfig, next);
      });
    } else {
      configure(corsConfig, next); // Use static corsConfig
    }
  };
}

/**
 * Configure CORS headers on the response object
 * @param req - The HTTP request
 * @param res - The HTTP response
 * @param corsOptions - The CORS options to apply
 */
function configureCorsHeaders<TRequest extends Request>(req: TRequest, res: Response, corsOptions: CorsOptions) {
  const mergedCorsOptions = { ...defaultCorsConfig, ...corsOptions };

  // Add Access-Control-Allow-Credentials header if specified
  if (mergedCorsOptions.credentials) {
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  // Add Access-Control-Expose-Headers header if specified
  if (mergedCorsOptions.exposedHeaders) {
    res.setHeader(
      "Access-Control-Expose-Headers",
      Array.isArray(mergedCorsOptions.exposedHeaders)
        ? mergedCorsOptions.exposedHeaders.join(", ")
        : mergedCorsOptions.exposedHeaders
    );
  }

  // Add Access-Control-Allow-Headers header if specified
  if (mergedCorsOptions.allowedHeaders) {
    res.setHeader(
      "Access-Control-Allow-Headers",
      Array.isArray(mergedCorsOptions.allowedHeaders)
        ? mergedCorsOptions.allowedHeaders.join(", ")
        : mergedCorsOptions.allowedHeaders
    );
  }

  // Add Access-Control-Max-Age header if specified
  if (mergedCorsOptions.maxAge) {
    res.setHeader("Access-Control-Max-Age", String(mergedCorsOptions.maxAge));
  }

  // Add Access-Control-Allow-Methods header if specified
  if (mergedCorsOptions.methods) {
    res.setHeader(
      "Access-Control-Allow-Method",
      Array.isArray(mergedCorsOptions.methods)
        ? mergedCorsOptions.methods.join(", ")
        : mergedCorsOptions.methods
    );
  }
}
 
/**
 * Set the Access-Control-Allow-Origin header based on the resolved origin
 * @param res - The HTTP response
 * @param origin - The resolved origin to allow
 */
function setOriginHeader(res: Response, origin: CorsOptions["origin"]) {
  if (typeof origin === "string") {
    res.setHeader("Access-Control-Allow-Origin", origin ?? "*");
  } else if (origin instanceof RegExp) {
    res.setHeader("Access-Control-Allow-Origin", origin.source ?? "*");
  } else if (Array.isArray(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin.join(", "));
  }
}

/**
 * Utility function to check if the request origin is allowed
 * @param origin - The configured origin (string, array, RegExp, or function)
 * @param requestOrigin - The origin from the request
 * @returns A boolean indicating if the origin is allowed
 */
const IsAllowedOrigin = async (origin: CorsOptions["origin"], requestOrigin: string): Promise<boolean> => {
  if (Array.isArray(origin)) {
    for (const allowedOrigin of origin) {
      if (await IsAllowedOrigin(allowedOrigin, requestOrigin)) {
        return true;
      }
    }
    return false;
  } else if (origin instanceof RegExp) {
    return origin.test(requestOrigin);
  } else if (typeof origin === "string") {
    return origin === "*" || origin.includes(requestOrigin);
  } else if (typeof origin === "function") {
    return new Promise((resolve, reject) => {
      origin(requestOrigin, (err, resolvedOrigin) => {
        if (err) {
          return reject(err);
        }
        resolve(IsAllowedOrigin(resolvedOrigin, requestOrigin));
      });
    });
  } else {
    return origin === undefined;
  }
};
