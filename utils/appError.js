// shared/utils/appError.js  (owner: Fate, HR)
// Shared services throw AppError(code, message). Controllers show `message` with req.flash.
// Codes: INVALID_LOGIN, ACCOUNT_DISABLED, PRODUCT_UNAVAILABLE, INSUFFICIENT_STOCK, DUPLICATE, VALIDATION_ERROR
export class AppError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}
