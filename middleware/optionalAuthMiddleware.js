import jwt from "jsonwebtoken";

import * as authRepository from "../lib/repositories/authRepository.js";

// Sama seperti authMiddleware, tapi tidak pernah menolak request.
// Dipakai pada route publik (misalnya daftar/detail event) yang
// perilakunya berbeda tergantung apakah user login atau tidak
// (contoh: admin/superadmin bisa melihat event berstatus apa saja,
// sedangkan customer/publik hanya melihat event "published").
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            req.user = null;
            return next();
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await authRepository.findById(decoded.id);

        req.user = (user && user.is_active) ? user : null;

        next();
    } catch (error) {
        // Token tidak valid/expired -> perlakukan sebagai anonim,
        // jangan blokir request publik.
        req.user = null;
        next();
    }
};

export default optionalAuthMiddleware;
