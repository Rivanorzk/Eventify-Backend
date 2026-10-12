import AppError from "../utils/AppError.js";

import * as ticketCategoryRepository
    from "../repositories/ticketCategoryRepository.js";

// Catatan: ticket_categories hanyalah label global (Regular/VIP/VVIP).
// Harga & stok tiket adalah per-event dan disimpan di
// event_ticket_categories, bukan di sini.

export const getTicketCategories = async () => {
    return await ticketCategoryRepository.findAll();
};

export const getTicketCategoryById = async (id) => {
    const category =
        await ticketCategoryRepository.findById(id);

    if (!category) {
        throw new AppError(
            "Kategori tiket tidak ditemukan",
            404
        );
    }

    return category;
};

export const createTicketCategory = async (body) => {
    const categoryName = body.category_name?.trim();

    if (!categoryName) {
        throw new AppError(
            "Nama kategori tiket wajib diisi",
            400
        );
    }

    const existing =
        await ticketCategoryRepository.findByName(
            categoryName
        );

    if (existing) {
        throw new AppError(
            "Kategori tiket sudah ada",
            409
        );
    }

    return await ticketCategoryRepository.create(
        categoryName
    );
};

export const updateTicketCategory = async (
    id,
    body
) => {
    const category =
        await ticketCategoryRepository.findById(
            id
        );

    if (!category) {
        throw new AppError(
            "Kategori tiket tidak ditemukan",
            404
        );
    }

    const categoryName = body.category_name?.trim();

    if (!categoryName) {
        throw new AppError(
            "Nama kategori tiket wajib diisi",
            400
        );
    }

    const existing =
        await ticketCategoryRepository.findByName(
            categoryName
        );

    if (
        existing &&
        Number(existing.id) !== Number(id)
    ) {
        throw new AppError(
            "Kategori tiket sudah ada",
            409
        );
    }

    return await ticketCategoryRepository.update(
        id,
        categoryName
    );
};

export const deleteTicketCategory = async (id) => {
    const category =
        await ticketCategoryRepository.findById(
            id
        );

    if (!category) {
        throw new AppError(
            "Kategori tiket tidak ditemukan",
            404
        );
    }

    await ticketCategoryRepository.remove(id);
};
