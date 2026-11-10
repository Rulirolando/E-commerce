import elektronik from "./img/elektronik.jpeg";
import handphone from "./img/handphone.jpeg";
import komputer from "./img/komputer.jpeg";
import otomotif from "./img/Otomotif.jpeg";
import fashion from "./img/fashion.png";
import kecantikan from "./img/kecantikan.jpeg";
import rumah from "./img/rumah.jpeg";
import kesehatan from "./img/kesehatan.jpeg";
import perkakas from "./img/perkakas.jpeg";
import olahraga from "./img/olahraga.jpeg";
const kategoriList = {
  Elektronik: {
    deskripsi: "Peralatan elektronik rumah tangga.",
    contoh: ["TV", "Kulkas", "AC", "Kipas", "Rice Cooker"],
    foto: elektronik,
  },
  "Handphone & Aksesoris": {
    deskripsi: "Semua handphone & aksesorinya.",
    contoh: ["iPhone", "Android", "Charger", "Earphone", "Case HP"],
    foto: handphone,
  },
  "Komputer & Laptop": {
    deskripsi: "Perangkat komputer & aksesoris.",
    contoh: ["Laptop", "PC", "Monitor", "Keyboard", "Mouse", "SSD"],
    foto: komputer,
  },
  Otomotif: {
    deskripsi: "Peralatan kendaraan & sparepart.",
    contoh: [
      "Oli",
      "Aki",
      "Helm",
      "Lampu motor",
      "Impact Wrench (mesin buka baut)",
    ],
    foto: otomotif,
  },
  Fashion: {
    deskripsi: "Pakaian & aksesoris pria.",
    contoh: [
      "Kaos",
      "Jaket",
      "Celana",
      "Topi",
      "Sepatu",
      "Tas",
      "Kacamata",
      "Kerudung",
      "Gelang",
    ],
    foto: fashion,
  },

  Kecantikan: {
    deskripsi: "Produk kosmetik & skincare.",
    contoh: ["Serum", "Lipstick", "Bedak", "Toner"],
    foto: kecantikan,
  },
  Kesehatan: {
    deskripsi: "Produk kesehatan tubuh.",
    contoh: ["Vitamin", "Suplemen", "Termometer"],
    foto: kesehatan,
  },
  "Rumah Tangga": {
    deskripsi: "Barang kebutuhan rumah non-elektronik.",
    contoh: ["Sapu", "Ember", "Rak Sepatu"],
    foto: rumah,
  },
  Perkakas: {
    deskripsi: "Alat kerja dan bengkel.",
    contoh: ["Bor", "Gerinda", "Tang", "Kunci Pas"],
    foto: perkakas,
  },
  Olahraga: {
    deskripsi: "Peralatan dan pakaian olahraga.",
    contoh: ["Barbel", "Matras", "Jersey"],
    foto: olahraga,
  },
};

export default kategoriList;
