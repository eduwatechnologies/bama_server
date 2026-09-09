function success(res, data, statusCode = 200, meta) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

function error(res, statusCode, code, message, details) {
  const body = {
    success: false,
    error: { code, message },
  };
  if (details) body.error.details = details;
  return res.status(statusCode).json(body);
}

module.exports = { success, error };
