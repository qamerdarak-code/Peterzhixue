class AppError extends Error {
  constructor(code, message, status = 500, details = null) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function publicError(error) {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
    };
  }
  return {
    status: 500,
    body: {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "AI解析暂时不可用，请稍后重试。",
      },
    },
  };
}

module.exports = { AppError, publicError };
