import { nanoid } from "nanoid";

export default function generateTicketCode() {
    return `TKT-${nanoid(10).toUpperCase()}`;
}