import * as repository from "../lib/repositories/eventTicketAreaRepository.js";
import * as eventTicketCategoryRepository from "../lib/repositories/eventTicketCategoryRepository.js";

export const getAreas = async (req, res) => {
    try {
        const { eventTicketCategoryId } = req.params;
        const data = await repository.findByEventTicketCategoryId(eventTicketCategoryId);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Get ticket areas error:", error);
        return res.status(500).json({ success: false, message: "Failed to get ticket areas." });
    }
};

export const createArea = async (req, res) => {
    try {
        const { event_ticket_category_id, area_name, floor, access_type, gate_name, description, display_order } = req.body;

        if (!event_ticket_category_id || !area_name) {
            return res.status(400).json({ success: false, message: "event_ticket_category_id dan area_name wajib diisi." });
        }

        const etc = await eventTicketCategoryRepository.findById(event_ticket_category_id);
        if (!etc) {
            return res.status(404).json({ success: false, message: "Event ticket category tidak ditemukan." });
        }

        const data = await repository.create({
            event_ticket_category_id, area_name, floor, access_type, gate_name, description, display_order,
        });

        return res.status(201).json({ success: true, message: "Area berhasil ditambahkan.", data });
    } catch (error) {
        console.error("Create ticket area error:", error);
        return res.status(500).json({ success: false, message: "Failed to create ticket area." });
    }
};

export const updateArea = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await repository.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Area tidak ditemukan." });
        }

        const { area_name, floor, access_type, gate_name, description, display_order } = req.body;
        if (!area_name) {
            return res.status(400).json({ success: false, message: "area_name wajib diisi." });
        }

        const data = await repository.update(id, { area_name, floor, access_type, gate_name, description, display_order });
        return res.status(200).json({ success: true, message: "Area berhasil diperbarui.", data });
    } catch (error) {
        console.error("Update ticket area error:", error);
        return res.status(500).json({ success: false, message: "Failed to update ticket area." });
    }
};

export const deleteArea = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await repository.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Area tidak ditemukan." });
        }
        await repository.remove(id);
        return res.status(200).json({ success: true, message: "Area berhasil dihapus." });
    } catch (error) {
        console.error("Delete ticket area error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete ticket area." });
    }
};