import * as repository from "../lib/repositories/eventTicketBenefitRepository.js";
import * as eventTicketCategoryRepository from "../lib/repositories/eventTicketCategoryRepository.js";

export const getBenefits = async (req, res) => {
    try {
        const { eventTicketCategoryId } = req.params;
        const data = await repository.findByEventTicketCategoryId(eventTicketCategoryId);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Get ticket benefits error:", error);
        return res.status(500).json({ success: false, message: "Failed to get ticket benefits." });
    }
};

export const createBenefit = async (req, res) => {
    try {
        const { event_ticket_category_id, title, description, icon, display_order } = req.body;

        if (!event_ticket_category_id || !title) {
            return res.status(400).json({ success: false, message: "event_ticket_category_id dan title wajib diisi." });
        }

        const etc = await eventTicketCategoryRepository.findById(event_ticket_category_id);
        if (!etc) {
            return res.status(404).json({ success: false, message: "Event ticket category tidak ditemukan." });
        }

        const data = await repository.create({ event_ticket_category_id, title, description, icon, display_order });
        return res.status(201).json({ success: true, message: "Benefit berhasil ditambahkan.", data });
    } catch (error) {
        console.error("Create ticket benefit error:", error);
        return res.status(500).json({ success: false, message: "Failed to create ticket benefit." });
    }
};

export const updateBenefit = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await repository.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Benefit tidak ditemukan." });
        }

        const { title, description, icon, display_order } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, message: "title wajib diisi." });
        }

        const data = await repository.update(id, { title, description, icon, display_order });
        return res.status(200).json({ success: true, message: "Benefit berhasil diperbarui.", data });
    } catch (error) {
        console.error("Update ticket benefit error:", error);
        return res.status(500).json({ success: false, message: "Failed to update ticket benefit." });
    }
};

export const deleteBenefit = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await repository.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Benefit tidak ditemukan." });
        }
        await repository.remove(id);
        return res.status(200).json({ success: true, message: "Benefit berhasil dihapus." });
    } catch (error) {
        console.error("Delete ticket benefit error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete ticket benefit." });
    }
};