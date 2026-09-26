class Response {
  success(res, data, message = "Success", statusCode = 200) {
    res.status(statusCode).json({
      status: "success",
      message,
      data,
    });
  }

  list(res, data, total, message = "Success", statusCode = 200) {
    res.status(statusCode).json({
      status: "success",
      message,
      data,
      total,
    });
  }

  insertionSuccess(
    res,
    data,
    message = "Insertion Successful",
    statusCode = 201,
  ) {
    return this.success(res, data, message, statusCode);
  }

  updateSuccess(res, data, message = "Update Successful", statusCode = 200) {
    return this.success(res, data, message, statusCode);
  }

  deletionSuccess(
    res,
    data,
    message = "Deletion Successful",
    statusCode = 200,
  ) {
    return this.success(res, data, message, statusCode);
  }

  error(res, errorMessage = "Internal Server Error", statusCode = 500) {
    res.status(statusCode).json({
      status: "error",
      message: errorMessage,
    });
  }

  notFoundError(res, errorMessage = "Not Found!", statusCode = 404) {
    this.error(res, errorMessage, statusCode);
  }
}

const response = new Response();
module.exports = response;
