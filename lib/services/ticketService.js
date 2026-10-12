import QRCode from "qrcode";
import AppError from "../utils/AppError.js";
import * as ticketRepository from "../repositories/ticketRepository.js";
import * as eventTicketAreaRepository from "../repositories/eventTicketAreaRepository.js";
import * as eventTicketBenefitRepository from "../repositories/eventTicketBenefitRepository.js";
import * as eventTicketRuleRepository from "../repositories/eventTicketRuleRepository.js";

export const getTickets = async () => await ticketRepository.getTickets();
export const getMyTickets = async (userId) => await ticketRepository.getMyTickets(userId);

export const getTicketById = async (id, userId, userRole) => {
    const ticket = await ticketRepository.getTicketById(id);

    if (!ticket) {
        throw new AppError("Tiket tidak ditemukan", 404);
    }

    const isOwner = ticket.customer_id === userId;
    const isStaff = ["admin", "superadmin"].includes(userRole);

    if (!isOwner && !isStaff) {
        throw new AppError("Anda tidak memiliki akses ke tiket ini", 403);
    }

    const qrCode = await QRCode.toDataURL(ticket.ticket_code);

    const [areas, benefits, rules] = await Promise.all([
        eventTicketAreaRepository.findByEventTicketCategoryId(ticket.event_ticket_category_id),
        eventTicketBenefitRepository.findByEventTicketCategoryId(ticket.event_ticket_category_id),
        eventTicketRuleRepository.findByEventTicketCategoryId(ticket.event_ticket_category_id),
    ]);

    return {
        ...ticket,
        qr_code: qrCode,
        areas,
        benefits,
        rules,
    };
};