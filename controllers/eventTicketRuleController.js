import * as repository from "../lib/repositories/eventTicketRuleRepository.js";
import * as eventTicketCategoryRepository from "../lib/repositories/eventTicketCategoryRepository.js";

export const getRules = async (req, res) => {
    try {
        const { eventTicketCategoryId } = req.params;
        const data = await repository.findByEventTicketCategoryId(eventTicketCategoryId);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Get ticket rules error:", error);
        return res.status(500).json({ success: false, message: "Failed to get ticket rules." });
    }
};

export const createRule = async (req, res) => {
    try {
        const { event_ticket_category_id, title, description, display_order } = req.body;

        if (!event_ticket_category_id || !title) {
            return res.status(400).json({ success: false, message: "event_ticket_category_id dan title wajib diisi." });
        }

        const etc = await eventTicketCategoryRepository.findById(event_ticket_category_id);
        if (!etc) {
            return res.status(404).json({ success: false, message: "Event ticket category tidak ditemukan." });
        }

        const data = await repository.create({ event_ticket_category_id, title, description, display_order });
        return res.status(201).json({ success: true, message: "Aturan berhasil ditambahkan.", data });
    } catch (error) {
        console.error("Create ticket rule error:", error);
        return res.status(500).json({ success: false, message: "Failed to create ticket rule." });
    }
};

export const updateRule = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await repository.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Aturan tidak ditemukan." });
        }

        const { title, description, display_order } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, message: "title wajib diisi." });
        }

        const data = await repository.update(id, { title, description, display_order });
        return res.status(200).json({ success: true, message: "Aturan berhasil diperbarui.", data });
    } catch (error) {
        console.error("Update ticket rule error:", error);
        return res.status(500).json({ success: false, message: "Failed to update ticket rule." });
    }
};

export const deleteRule = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await repository.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Aturan tidak ditemukan." });
        }
        await repository.remove(id);
        return res.status(200).json({ success: true, message: "Aturan berhasil dihapus." });
    } catch (error) {
        console.error("Delete ticket rule error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete ticket rule." });
    }
};