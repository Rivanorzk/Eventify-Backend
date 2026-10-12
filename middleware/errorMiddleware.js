const errorMiddleware = (err, req, res, next) => {

    console.error(err);

    // Dibaca oleh requestMetrics untuk daftar error terbaru di System Console.
    res.locals.errorMessage = err.message;

    return res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });

};

export default errorMiddleware;