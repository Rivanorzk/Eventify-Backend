import * as repository from "../lib/repositories/eventTicketCategoryRepository.js";
import * as eventRepository from "../lib/repositories/eventRepository.js";
import * as ticketCategoryRepository from "../lib/repositories/ticketCategoryRepository.js";
import * as areaRepository from "../lib/repositories/eventTicketAreaRepository.js"
import * as benefitRepository from "../lib/repositories/eventTicketBenefitRepository.js"
import * as ruleRepository from "../lib/repositories/eventTicketRuleRepository.js"

// admin hanya boleh mengelola event miliknya sendiri; superadmin bebas.
const assertCanManageEvent = (event, user) => {
    if (!user) return true;
    if (user.role === "superadmin") return true;
    if (user.role === "admin" && event.admin_id === user.id) return true;
    return false;
};

// Tier tiket punya nama bebas (mis. "Festival A", "Tribune"), tapi di
// database nama tetap disimpan lewat tabel lookup ticket_categories
// (lihat catatan di migrations/2026_09_add_event_ticket_category_fields.sql).
// Helper ini mencari baris yang cocok (case-insensitive) atau membuat
// baris baru kalau nama tersebut belum pernah dipakai sama sekali.
const findOrCreateTicketCategoryByName = async (rawName) => {
    const name = String(rawName || "").trim();

    const [rows] = await Promise.all([
        ticketCategoryRepository.findAll()
    ]);

    const existing = rows.find(
        (c) => c.category_name.toLowerCase() === name.toLowerCase()
    );

    if (existing) return existing;

    return await ticketCategoryRepository.create(name);
};

export const getEventTicketCategories = async (req, res) => {
    try {
        const { eventId } = req.params;

        const data = await repository.findByEvent(eventId);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error(
            "Get event ticket categories error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to get event ticket categories."
        });
    }
};

export const getEventTicketCategoriesByEvent = async (
    req,
    res
) => {
    try {
        const { eventId } = req.params;

        const data = await repository.findByEvent(eventId);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error(
            "Get event ticket categories by event error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to get event ticket categories."
        });
    }
};

export const getEventTicketCategoryById = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        const data = await repository.findById(id);

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Event ticket category not found."
            });
        }

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error(
            "Get event ticket category error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to get event ticket category."
        });
    }
};

export const createEventTicketCategory = async (
    req,
    res
) => {
    try {
        const {
            event_id,
            name,
            ticket_category_id,
            price,
            description,
            is_active,
        } = req.body;

        // Terima `quota` (nama lama) maupun `stock` (dikirim frontend).
        const quota = req.body.quota ?? req.body.stock;

        // Kategori bisa dipilih lewat ticket_category_id (lookup yang
        // sudah ada) atau lewat nama bebas.
        if (!event_id || (!ticket_category_id && !String(name || "").trim())) {
            return res.status(400).json({
                success: false,
                message: "Event dan kategori tiket wajib diisi."
            });
        }

        if (
            price === undefined ||
            price === null ||
            Number(price) < 0 ||
            Number.isNaN(Number(price))
        ) {
            return res.status(400).json({
                success: false,
                message: "Harga harus berupa angka yang valid."
            });
        }

        if (
            quota === undefined ||
            quota === null ||
            Number(quota) <= 0 ||
            Number.isNaN(Number(quota))
        ) {
            return res.status(400).json({
                success: false,
                message: "Kuota harus lebih dari 0."
            });
        }

        const event =
            await eventRepository.findById(event_id);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found."
            });
        }

        if (!assertCanManageEvent(event, req.user)) {
            return res.status(403).json({
                success: false,
                message: "Anda tidak memiliki akses terhadap event ini."
            });
        }

        let category;
        if (ticket_category_id) {
            category = await ticketCategoryRepository.findById(
                ticket_category_id
            );

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: "Ticket category not found."
                });
            }
        } else {
            category = await findOrCreateTicketCategoryByName(name);
        }

        const existing =
            await repository.findByEventAndCategory(
                event_id,
                category.id
            );

        if (existing) {
            return res.status(409).json({
                success: false,
                message:
                    "Kategori tiket dengan nama ini sudah ada untuk event ini."
            });
        }

        const data =
            await repository.create({
                event_id,
                ticket_category_id: category.id,
                price: Number(price),
                stock: Number(quota),
                description: description ? String(description).trim() : null,
                is_active: is_active === undefined ? true : !!is_active,
            });

        return res.status(201).json({
            success: true,
            message:
                "Kategori tiket berhasil ditambahkan ke event.",
            data
        });
    } catch (error) {
        console.error(
            "Create event ticket category error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to add ticket category to event."
        });
    }
};

export const updateEventTicketCategory = async (
    req,
    res
) => {
    try {
        const { id } = req.params;
        const { name, ticket_category_id, price, description, is_active } = req.body;
        const quota = req.body.quota ?? req.body.stock;

        const existing =
            await repository.findById(id);

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Event ticket category not found."
            });
        }

        const event = await eventRepository.findById(existing.event_id);

        if (!event || !assertCanManageEvent(event, req.user)) {
            return res.status(403).json({
                success: false,
                message: "Anda tidak memiliki akses terhadap event ini."
            });
        }

        if (
            price === undefined ||
            price === null ||
            Number(price) < 0 ||
            Number.isNaN(Number(price))
        ) {
            return res.status(400).json({
                success: false,
                message: "Harga harus berupa angka yang valid."
            });
        }

        if (
            quota === undefined ||
            quota === null ||
            Number(quota) <= 0 ||
            Number.isNaN(Number(quota))
        ) {
            return res.status(400).json({
                success: false,
                message: "Kuota harus lebih dari 0."
            });
        }

        const sold = existing.sold; // sudah dihitung repository: stock - remaining_stock
        const newQuota = Number(quota);

        if (newQuota < sold) {
            return res.status(400).json({
                success: false,
                message:
                    "Kuota tidak boleh lebih kecil dari tiket yang sudah terjual."
            });
        }

        // Nama tier boleh diganti tanpa memengaruhi event lain, karena
        // ini hanya memindahkan ticket_category_id ke baris lookup
        // yang sesuai (dibuat baru kalau nama belum pernah dipakai).
        let ticketCategoryId = existing.ticket_category_id;
        if (ticket_category_id) {
            ticketCategoryId = Number(ticket_category_id);
        } else if (name !== undefined && String(name).trim()) {
            const category = await findOrCreateTicketCategoryByName(name);
            ticketCategoryId = category.id;
        }

        const remainingStock = newQuota - sold;

        const data =
            await repository.update(id, {
                ticket_category_id: ticketCategoryId,
                price: Number(price),
                stock: newQuota,
                remaining_stock: remainingStock,
                description:
                    description !== undefined
                        ? (description ? String(description).trim() : null)
                        : existing.description,
                is_active:
                    is_active !== undefined ? !!is_active : existing.is_active,
            });

        return res.status(200).json({
            success: true,
            message:
                "Event ticket category updated successfully.",
            data
        });
    } catch (error) {
        console.error(
            "Update event ticket category error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to update event ticket category."
        });
    }
};

export const deleteEventTicketCategory = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        const existing =
            await repository.findById(id);

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Event ticket category not found."
            });
        }

        const event = await eventRepository.findById(existing.event_id);

        if (!event || !assertCanManageEvent(event, req.user)) {
            return res.status(403).json({
                success: false,
                message: "Anda tidak memiliki akses terhadap event ini."
            });
        }

        if (existing.sold > 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Tidak bisa menghapus kategori yang sudah memiliki penjualan."
            });
        }

        await repository.remove(id);

        return res.status(200).json({
            success: true,
            message:
                "Event ticket category deleted successfully."
        });
    } catch (error) {
        console.error(
            "Delete event ticket category error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to delete event ticket category."
        });
    }
};

export const getEventTicketCategoryDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await repository.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Event ticket category not found." });
        }

        const [areas, benefits, rules] = await Promise.all([
            areaRepository.findByEventTicketCategoryId(id),
            benefitRepository.findByEventTicketCategoryId(id),
            ruleRepository.findByEventTicketCategoryId(id),
        ]);

        return res.status(200).json({
            success: true,
            data: { ...category, areas, benefits, rules },
        });
    } catch (error) {
        console.error("Get event ticket category detail error:", error);
        return res.status(500).json({ success: false, message: "Failed to get event ticket category detail." });
    }
};