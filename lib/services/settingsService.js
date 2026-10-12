import AppError from "../utils/AppError.js";
import * as settingsRepository from "../repositories/settingsRepository.js";

export const SERVICE_FEE_KEY = "service_fee_percent";

// Batas atas supaya salah ketik (mis. 50 padahal maksudnya 5) tidak
// langsung menagih customer dengan biaya yang tidak masuk akal.
export const MAX_SERVICE_FEE_PERCENT = 30;

// Biaya layanan (% dari harga tiket). Kalau baris setting belum ada atau
// rusak, dianggap 0 supaya harga customer tidak berubah.
export const getServiceFeePercent = async (executor) => {

    const value = await settingsRepository.getValue(
        SERVICE_FEE_KEY,
        executor
    );

    const percent = Number(value);

    return Number.isFinite(percent) && percent >= 0 && percent <= 100
        ? percent
        : 0;

};

export const getServiceFeeSetting = async () => {

    const row = await settingsRepository.getRow(SERVICE_FEE_KEY);

    return {
        service_fee_percent: await getServiceFeePercent(),
        updated_at: row?.updated_at ?? null,
        updated_by: row?.updated_by_username ?? null,
    };

};

export const updateServiceFee = async (percent, userId) => {

    const value = Math.round(Number(percent) * 100) / 100;

    if (!Number.isFinite(value) || value < 0) {
        throw new AppError("Biaya layanan tidak valid", 400);
    }

    if (value > MAX_SERVICE_FEE_PERCENT) {
        throw new AppError(
            `Biaya layanan maksimal ${MAX_SERVICE_FEE_PERCENT}%`,
            400
        );
    }

    await settingsRepository.setValue(SERVICE_FEE_KEY, value, userId);

    return await getServiceFeeSetting();

};
