// Perhitungan nominal order (fungsi murni, tanpa akses DB).
//
// Biaya layanan = persentase dari harga tiket, dibayar customer di atas
// harga tiket. Dihitung dari harga tiket SETELAH diskon voucher dan
// dibulatkan ke rupiah utuh (Midtrans hanya menerima rupiah bulat).
//
//   final_price = total_price - discount_amount
//   service_fee = round(final_price x service_fee_percent / 100)
//   grand_total = final_price + service_fee        (yang dibayar customer)
//
// Contoh: tiket Rp100.000, biaya layanan 5%  ->  customer bayar Rp105.000.

export const calculateOrderAmounts = ({
    totalPrice,
    discountAmount = 0,
    serviceFeePercent = 0,
}) => {

    const total = Number(totalPrice);
    const discount = Number(discountAmount);
    const percent = Number(serviceFeePercent);

    if (!Number.isFinite(total) || total < 0) {
        throw new Error("totalPrice tidak valid");
    }

    if (!Number.isFinite(discount) || discount < 0 || discount > total) {
        throw new Error("discountAmount tidak valid");
    }

    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        throw new Error("serviceFeePercent tidak valid");
    }

    const finalPrice = Math.round((total - discount) * 100) / 100;
    const serviceFee = Math.round((finalPrice * percent) / 100);
    const grandTotal = Math.round((finalPrice + serviceFee) * 100) / 100;

    return {
        totalPrice: total,
        discountAmount: discount,
        finalPrice,
        serviceFeePercent: percent,
        serviceFee,
        grandTotal,
    };

};
