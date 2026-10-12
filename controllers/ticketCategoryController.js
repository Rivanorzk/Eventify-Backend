import * as ticketCategoryRepository from "../lib/repositories/ticketCategoryRepository.js";
import * as auditLogService from "../lib/services/auditlogService.js";

export const getTicketCategories = async (req, res) => {
    try {
        const data = await ticketCategoryRepository.findAll();

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Get ticket categories error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to get ticket categories."
        });
    }
};

export const getTicketCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        const data = await ticketCategoryRepository.findById(id);

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Ticket category not found."
            });
        }

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Get ticket category error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to get ticket category."
        });
    }
};

export const createTicketCategory = async (req, res) => {
    try {
        const { category_name } = req.body;

        if (!category_name || !category_name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Category name is required."
            });
        }

        const existing =
            await ticketCategoryRepository.findByName(
                category_name.trim()
            );

        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Ticket category already exists."
            });
        }

        const data =
            await ticketCategoryRepository.create(
                category_name.trim()
            );

        return res.status(201).json({
            success: true,
            message: "Ticket category created successfully.",
            data
        });
    } catch (error) {
        console.error("Create ticket category error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create ticket category."
        });
    }
};

export const updateTicketCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { category_name } = req.body;

        if (!category_name || !category_name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Category name is required."
            });
        }

        const existing =
            await ticketCategoryRepository.findById(id);

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Ticket category not found."
            });
        }

        const duplicate =
            await ticketCategoryRepository.findByName(
                category_name.trim()
            );

        if (duplicate && duplicate.id !== Number(id)) {
            return res.status(409).json({
                success: false,
                message: "Ticket category already exists."
            });
        }

        const data =
            await ticketCategoryRepository.update(
                id,
                category_name.trim()
            );

        return res.status(200).json({
            success: true,
            message: "Ticket category updated successfully.",
            data
        });
    } catch (error) {
        console.error("Update ticket category error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update ticket category."
        });
    }
};

export const deleteTicketCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const existing =
            await ticketCategoryRepository.findById(id);

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Ticket category not found."
            });
        }

        await ticketCategoryRepository.remove(id);

        await auditLogService.logActivity({
            actor: req.user,
            req,
            action: "DELETE_TICKET_CATEGORY",
            entityType: "ticket_category",
            entityId: id,
            description: `Menghapus kategori tiket "${existing.category_name}"`,
        });

        return res.status(200).json({
            success: true,
            message: "Ticket category deleted successfully."
        });
    } catch (error) {
        console.error("Delete ticket category error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete ticket category."
        });
    }
};