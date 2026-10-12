import { nanoid } from "nanoid";

const generateInvoice = () => {

    const date = new Date();

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");

    return `INV-${yyyy}${mm}${dd}-${nanoid(8).toUpperCase()}`;

};

export default generateInvoice;
