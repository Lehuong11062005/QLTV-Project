// src/pages/page_admin/UserManagement.js
import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import {
    getAllDocGia,
    addDocGia,
    updateDocGia,
    updateDocGiaStatus
} from "../../services/adminService";
import "./UserManagement.css";

/* ================= MODAL ================= */
const ReaderFormModal = ({ reader, onSave, onClose, isSubmitting }) => {
    const [formData, setFormData] = useState(reader);
    const isEdit = !!reader?.MaDG;

    const handleChange = e =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = e => {
        e.preventDefault();
        const payload = {
            HoTen: formData.HoTen,
            Email: formData.Email || null,
            SDT: formData.SDT || null,
            DiaChi: formData.DiaChi || null
        };
        if (!isEdit) {
            payload.TenDangNhap = formData.TenDangNhap;
            payload.MatKhau = formData.MatKhau;
        }
        onSave(payload, isEdit ? formData.MaDG : null);
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>{isEdit ? "Cập nhật độc giả" : "Thêm độc giả mới"}</h3>
                <form onSubmit={handleSubmit}>
                    <input name="HoTen" placeholder="Họ tên *" value={formData.HoTen} onChange={handleChange} required />
                    <input
                        name="TenDangNhap"
                        placeholder="Tên đăng nhập *"
                        value={formData.TenDangNhap}
                        onChange={handleChange}
                        disabled={isEdit}
                        required
                    />
                    {!isEdit && (
                        <input
                            type="password"
                            name="MatKhau"
                            placeholder="Mật khẩu *"
                            value={formData.MatKhau}
                            onChange={handleChange}
                            required
                        />
                    )}
                    <input name="Email" placeholder="Email" value={formData.Email} onChange={handleChange} />
                    <input name="SDT" placeholder="Số điện thoại" value={formData.SDT} onChange={handleChange} />
                    <textarea name="DiaChi" placeholder="Địa chỉ" value={formData.DiaChi} onChange={handleChange} />

                    <div className="modal-actions">
                        <button type="button" className="ghost" onClick={onClose}>Hủy</button>
                        <button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Đang lưu..." : "Lưu"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ================= MAIN ================= */
export default function UserManagement() {
    const [list, setList] = useState([]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [modal, setModal] = useState(false);
    const [current, setCurrent] = useState(null);

    useEffect(() => {
        getAllDocGia().then(res => setList(res.data));
    }, []);

    const filtered = list.filter(r => {
        const t = search.toLowerCase();
        const matchText = r.MaDG.toLowerCase().includes(t) || r.HoTen.toLowerCase().includes(t);
        if (!matchText) return false;
        if (filter === "all") return true;
        if (filter === "active") return r.TrangThaiMuon === "Không mượn";
        if (filter === "borrowing") return r.TrangThaiMuon !== "Không mượn";
        if (filter === "overdue") return r.TrangThaiMuon === "Quá hạn trả";
        return true;
    });

    const save = async (data, id) => {
        id ? await updateDocGia(id, data) : await addDocGia(data);
        setModal(false);
        const res = await getAllDocGia();
        setList(res.data);
    };

    const toggle = async (id, st) => {
        const next = st === "Hoạt động" ? "Khóa" : "Hoạt động";
        await updateDocGiaStatus(id, { TrangThaiThe: next });
        setList(l => l.map(i => i.MaDG === id ? { ...i, TrangThaiThe: next } : i));
    };

    return (
        <Layout>
            <div className="header">
                <h2>Quản lý độc giả</h2>
                <div className="filters">
                    <input placeholder="Tìm độc giả..." value={search} onChange={e => setSearch(e.target.value)} />
                    <select value={filter} onChange={e => setFilter(e.target.value)}>
                        <option value="all">Tất cả</option>
                        <option value="active">Không mượn</option>
                        <option value="borrowing">Đang mượn</option>
                        <option value="overdue">Quá hạn</option>
                    </select>
                    <button onClick={() => { setCurrent({}); setModal(true); }}>+ Thêm</button>
                </div>
            </div>

            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Mã</th>
                            <th>Độc giả</th>
                            <th>Liên hệ</th>
                            <th className="center">Sách</th>
                            <th>Mượn</th>
                            <th>Thẻ</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(r => (
                            <tr key={r.MaDG}>
                                <td className="id">{r.MaDG}</td>
                                <td>
                                    <div className="primary">{r.HoTen}</div>
                                    <div className="secondary">@{r.TenDangNhap}</div>
                                </td>
                                <td>
                                    <div>{r.Email}</div>
                                    <div className="secondary">{r.SDT}</div>
                                </td>
                                <td className="center">{r.SoSachDangMuon}</td>
                                <td>{r.TrangThaiMuon}</td>
                                <td>
                                    <span className={`pill ${r.TrangThaiThe === "Hoạt động" ? "ok" : "lock"}`}>
                                        {r.TrangThaiThe}
                                    </span>
                                </td>
                                <td className="actions">
                                    <button className="link" onClick={() => { setCurrent(r); setModal(true); }}>Sửa</button>
                                    <button className="link danger" onClick={() => toggle(r.MaDG, r.TrangThaiThe)}>
                                        {r.TrangThaiThe === "Hoạt động" ? "Khóa" : "Mở"}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <ReaderFormModal
                    reader={current}
                    onSave={save}
                    onClose={() => setModal(false)}
                />
            )}
        </Layout>
    );
}
