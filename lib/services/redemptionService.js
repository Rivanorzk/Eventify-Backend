import db from "../../config/database.js";

import AppError from "../utils/AppError.js";

import * as ticketRepository from "../repositories/ticketRepository.js";
import * as redemptionRepository from "../repositories/redemptionRepository.js";

export const redeemTicket = async (
    adminId,
    body
) => {

    const connection = await db.getConnection();

    try {

        await connection.beginTransaction();

        const ticket =
            await ticketRepository.getTicketByCode(
                connection,
                body.ticket_code
            );

        if (!ticket) {
            throw new AppError(
                "Tiket tidak ditemukan",
                404
            );
        }

        if (ticket.status === "used") {
            throw new AppError(
                "Tiket sudah digunakan",
                400
            );
        }

        if (ticket.event_status === "cancelled") {
            throw new AppError(
                "Event untuk tiket ini sudah dibatalkan",
                400
            );
        }

        const eventDateTime = new Date(
            `${String(ticket.event_date).slice(0, 10)}T${ticket.start_time}`
        );

        if (eventDateTime.getTime() < Date.now()) {
            throw new AppError(
                "Tiket sudah kedaluwarsa",
                400
            );
        }

        if (ticket.status !== "active") {
            throw new AppError(
                "Tiket tidak valid",
                400
            );
        }

        await ticketRepository.updateTicketStatus(
            connection,
            ticket.id,
            "used"
        );

        await redemptionRepository.createRedemption(
            connection,
            {
                ticket_id: ticket.id,
                admin_id: adminId,
                notes: body.notes
            }
        );

        await connection.commit();

        return {
            ticket_code: ticket.ticket_code,
            status: "used",
            event_title: ticket.event_title,
            event_location: ticket.event_location,
            category_name: ticket.category_name,
            customer_name: ticket.customer_name,
            redeemed_at: new Date()
        };

    } catch (err) {

        await connection.rollback();

        throw err;

    } finally {

        connection.release();

    }

};

export const getRedemptions = async () => {

    return await redemptionRepository.getRedemptions();

};

export const getRedemptionById = async (id) => {

    const redemption =
        await redemptionRepository.getRedemptionById(id);

    if (!redemption) {
        throw new AppError(
            "Data redemption tidak ditemukan",
            404
        );
    }

    return redemption;

};