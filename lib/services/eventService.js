import AppError from "../utils/AppError.js";
import * as eventRepository from "../repositories/eventRepository.js";
import * as eventReminderRepository from "../repositories/eventReminderRepository.js";
import * as settingsService from "./settingsService.js";

// Aturan visibilitas status event (lihat PRD bagian 6 & 28):
// - customer / publik (tidak login, atau role customer) -> hanya "published",
//   KECUALI kalau secara eksplisit minta status=draft (dipakai section
//   "Akan Datang Segera" di dashboard customer untuk preview jadwal konser
//   yang belum resmi dipublikasikan). Status lain (all/finished/cancelled/dll)
//   tetap dipaksa jadi "published".
// - admin -> boleh melihat SEMUA status, tapi hanya untuk event miliknya
//            sendiri (admin_id = user.id). Event admin lain tetap
//            hanya terlihat kalau published.
// - superadmin -> boleh melihat semua status untuk semua event.
export async function getEvents(queryParams = {}, user = null) {
    try {
        const {
            search = "",
            category = "",
            sort = "latest",
            status = "",
        } = queryParams;

        const isSuperadmin = user?.role === "superadmin";
        const isAdmin = user?.role === "admin";

        let events;

        if (isSuperadmin) {

            // Superadmin: bebas filter status apa saja, default "all".
            events = await eventRepository.findAll({
                search,
                category,
                sort,
                status: status || "all",
            });

        } else if (isAdmin) {

            // Admin: ambil semua status, lalu batasi hanya event miliknya
            // sendiri kecuali dia sedang melihat status "published" (event
            // publik tetap boleh dilihat siapa saja termasuk admin lain).
            events = await eventRepository.findAll({
                search,
                category,
                sort,
                status: status || "all",
            });

            events = events.filter(
                (event) =>
                    event.admin_id === user.id ||
                    event.status === "published"
            );

        } else {

            // Customer / publik: default hanya event published. Kalau client
            // eksplisit minta status=draft (section "Akan Datang Segera"),
            // izinkan supaya preview jadwal konser draft ikut tampil. Selain
            // "draft", query status apa pun dari client tetap dipaksa jadi
            // "published".
            const publicStatus = status === "draft" ? "draft" : "published";

            events = await eventRepository.findAll({
                search,
                category,
                sort,
                status: publicStatus,
            });

        }

        // Tandai event mana saja yang sudah di-reminder oleh user yang
        // sedang login, dipakai frontend untuk state ikon lonceng
        // "Ingatkan Saya" (terisi/tidak) tanpa perlu request terpisah.
        if (user) {
            const remindedIds = await eventReminderRepository.findEventIdsByUserId(
                user.id
            );
            const remindedSet = new Set(remindedIds);

            events = events.map((event) => ({
                ...event,
                is_reminded: remindedSet.has(event.id),
            }));
        } else {
            events = events.map((event) => ({
                ...event,
                is_reminded: false,
            }));
        }

        return events;
    } catch (error) {
        console.error("Error in eventService.getEvents:", error);
        throw error;
    }
}

export const getEventById = async (id, user = null) => {

    const event = await eventRepository.findById(id);

    if (!event) {
        throw new AppError("Event tidak ditemukan", 404);
    }

    const isSuperadmin = user?.role === "superadmin";
    const isOwnerAdmin =
        user?.role === "admin" && event.admin_id === user.id;

    // Publik boleh membuka detail event "published" (normal) maupun
    // "draft" (preview dari section "Akan Datang Segera"), supaya klik
    // dari kartu draft di dashboard customer tidak berakhir 404. Status
    // lain (finished/cancelled) tetap disembunyikan dari publik.
    const isPubliclyVisible =
        event.status === "published" || event.status === "draft";

    if (
        !isPubliclyVisible &&
        !isSuperadmin &&
        !isOwnerAdmin
    ) {
        throw new AppError("Event tidak ditemukan", 404);
    }

    const isReminded = user
        ? await eventReminderRepository.exists(user.id, event.id)
        : false;

    // Persentase biaya layanan yang berlaku saat ini, supaya checkout di
    // web/mobile bisa menampilkan perkiraan total otomatis (tanpa env manual).
    return {
        ...event,
        is_reminded: isReminded,
        service_fee_percent: await settingsService.getServiceFeePercent(),
    };

};

export const createEvent = async (adminId, body) => {

    const eventId = await eventRepository.create({
        ...body,
        admin_id: adminId
    });

    return eventRepository.findById(eventId);

};

// PRD Rule 8 - Authorization:
// admin hanya boleh mengelola event yang admin_id-nya sama dengan
// dirinya sendiri. Superadmin bisa mengelola seluruh event.
const assertCanManageEvent = (event, user) => {

    if (!user) return;

    if (user.role === "superadmin") return;

    if (user.role === "admin" && event.admin_id === user.id) return;

    throw new AppError(
        "Anda tidak memiliki akses terhadap event ini",
        403
    );

};

export const updateEvent = async (id, body, user = null) => {

    const event = await eventRepository.findById(id);

    if (!event) {
        throw new AppError("Event tidak ditemukan", 404);
    }

    assertCanManageEvent(event, user);

    // Update bersifat parsial: field yang tidak dikirim (mis. saat admin
    // hanya mengubah status lewat quick-action) harus mempertahankan
    // nilai lama, bukan menimpanya jadi NULL.
    const merged = {
        category_id: body.category_id ?? event.category_id,
        title: body.title ?? event.title,
        description: body.description ?? event.description,
        location: body.location ?? event.location,
        latitude: body.latitude ?? event.latitude,
        longitude: body.longitude ?? event.longitude,
        poster: body.poster ?? event.poster,
        event_date: body.event_date ?? event.event_date,
        start_time: body.start_time ?? event.start_time,
        sales_start_at: body.sales_start_at ?? event.sales_start_at,
        status: body.status ?? event.status,
    };

    await eventRepository.update(id, merged);

    return eventRepository.findById(id);

};

export const deleteEvent = async (id, user = null) => {

    const event = await eventRepository.findById(id);

    if (!event) {
        throw new AppError("Event tidak ditemukan", 404);
    }

    assertCanManageEvent(event, user);

    await eventRepository.remove(id);

};
