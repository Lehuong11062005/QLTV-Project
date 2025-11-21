import React, { useState, useEffect } from "react";
// FIX PATH: Lên 3 cấp để về src/
import Layout from "../../components/Layout";
// FIX PATH: Lên 3 cấp để về src/
import { searchBorrowForReturn, returnBook, getActiveBorrowOrdersList } from "../../services/returnService"; 
import { useNavigate } from "react-router-dom";
// PATH OK
import "./AdminBorrowReturn.css"; 

// Helper format tiền (Thêm VND để rõ ràng hơn)
const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

// --- COMPONENT TRỢ GIÚP: HIỂN THỊ DANH SÁCH PHIẾU ĐANG HOẠT ĐỘNG ---
const ActiveLoanList = ({ onSelectOrder, onKeywordChange, list, loadingList }) => {
    
    // Hàm này được gọi khi người dùng nhập keyword
    const handleInputChange = (e) => {
        onKeywordChange(e.target.value);
    };

    const getStatusBadge = (status) => {
        const style = { padding: '4px 8px', borderRadius: '4px', fontSize: '0.8em', fontWeight: '600' };
        if (status === 'QuaHan') return <span className="badge QuaHan">QUÁ HẠN</span>;
        if (status === 'DaDuyet') return <span className="badge DaDuyet">Đang mượn</span>;
        return status;
    };

    return (
        <div className="list-section">
            <h3 className="section-title">Danh sách Phiếu đang Mượn</h3>
            <div className="search-form" style={{ marginBottom: '15px' }}>
                <input
                    type="text"
                    placeholder="🔍 Lọc theo Mã phiếu/Tên độc giả..."
                    onChange={handleInputChange}
                    className="search-input"
                    style={{ width: '350px' }}
                />
            </div>

            {loadingList ? (
                <p className="loading-msg">⏳ Đang tải danh sách...</p>
            ) : list.length === 0 ? (
                <p className="empty-msg">Không có phiếu mượn nào đang chờ trả.</p>
            ) : (
                <div className="table-responsive">
                    <table className="active-loan-table">
                        <thead>
                            <tr>
                                <th>Mã Phiếu</th>
                                <th>Độc Giả</th>
                                <th>Ngày Mượn</th>
                                <th>Hạn Trả</th>
                                <th>Trạng Thái</th>
                                <th width="100">Chọn</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((order) => (
                                <tr key={order.MaMuon}>
                                    <td><span className="code-badge">{order.MaMuon}</span></td>
                                    <td>{order.HoTen}</td>
                                    <td>{new Date(order.NgayMuon).toLocaleDateString('vi-VN')}</td>
                                    <td>{new Date(order.HanTra).toLocaleDateString('vi-VN')}</td>
                                    <td>{getStatusBadge(order.TrangThai)}</td>
                                    <td>
                                        <button className="btn-select" onClick={() => onSelectOrder(order.MaMuon)}>
                                            Xử lý
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// --- COMPONENT CHÍNH ---

export default function AdminBorrowReturn() {
    const navigate = useNavigate(); 
    
    // State của List view
    const [activeLoans, setActiveLoans] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [listSearchKeyword, setListSearchKeyword] = useState("");
    
    // State xử lý Phiếu (từ code cũ của bạn)
    const [searchKeyword, setSearchKeyword] = useState("");
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [borrowInfo, setBorrowInfo] = useState(null);
    const [booksList, setBooksList] = useState([]); 
    const [processState, setProcessState] = useState({}); 
    
    // --- Lifecycle & Logic List View ---
    useEffect(() => {
        // Tải list khi component mount và khi listSearchKeyword thay đổi
        const delayDebounce = setTimeout(() => {
            fetchActiveLoansList(listSearchKeyword);
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [listSearchKeyword]);
    
    const fetchActiveLoansList = async (keyword) => {
        setLoadingList(true);
        try {
            const res = await getActiveBorrowOrdersList(keyword);
            setActiveLoans(res.data?.data || []);
        } catch (error) {
            console.error("Lỗi tải danh sách đang mượn:", error);
            setActiveLoans([]);
        } finally {
            setLoadingList(false);
        }
    };
    
    // Hàm này được gọi khi bấm nút Xử lý trên List view
    const handleSelectFromList = (maMuon) => {
        setSearchKeyword(maMuon);
        // Tắt List view và hiện Processing view
        handleSearch({ preventDefault: () => {} }, maMuon);
    };

    // Hàm tìm kiếm (Tối ưu từ code cũ)
    const handleSearch = async (e, maMuonFromList = null) => {
        if (e && e.preventDefault) e.preventDefault();
        
        const keyword = maMuonFromList || searchKeyword.trim();
        if (!keyword) return;

        setLoadingSearch(true);
        setSearchError("");
        setBorrowInfo(null);
        setBooksList([]);
        setProcessState({});

        try {
            const res = await searchBorrowForReturn(keyword);
            // Kiểm tra kỹ cấu trúc trả về
            const data = res.data && Array.isArray(res.data.data) ? res.data.data : [];

            if (data.length > 0) {
                const info = data[0];
                
                // Lọc danh sách sách: CHỈ LẤY SÁCH CHƯA TRẢ
                const uniqueBooks = [];
                const seen = new Set();
                
                data.forEach(item => {
                    // 🔥 FIX: Chỉ hiển thị sách có trạng thái bản sao là 'DangMuon'
                    // Nếu trạng thái là 'SanSang' (đã trả), 'HuHong', 'Mat' thì bỏ qua
                    const isBookActive = item.TrangThaiBanSao === 'DangMuon';

                    if (item.MaBanSao && !seen.has(item.MaBanSao) && isBookActive) {
                        uniqueBooks.push({
                            MaBanSao: item.MaBanSao,
                            TenSach: item.TenSach,
                            MaSach: item.MaSach,
                            TrangThaiBanSao: item.TrangThaiBanSao
                        });
                        seen.add(item.MaBanSao);
                    }
                });

                // Nếu tìm thấy phiếu nhưng tất cả sách đã được trả hết
                if (uniqueBooks.length === 0) {
                    setSearchError("Phiếu này đã trả hết sách hoặc không có sách nào đang mượn.");
                    setLoadingSearch(false);
                    return;
                }

                setBorrowInfo({
                    MaMuon: info.MaMuon,
                    DocGia: info.DocGiaHoTen || info.HoTen, 
                    NgayMuon: info.NgayMuon,
                    HanTra: info.HanTra,
                    TrangThai: info.TrangThai
                });
                setBooksList(uniqueBooks);

                // Khởi tạo state form xử lý
                const initialProcess = {};
                uniqueBooks.forEach(item => {
                    initialProcess[item.MaBanSao] = {
                        isSelected: false, 
                        isDamaged: false,
                        fine: 0,
                        note: ""
                    };
                });
                setProcessState(initialProcess);
                setActiveLoans([]); // Ẩn List view
            } else {
                setSearchError("Không tìm thấy phiếu mượn hoặc mã không hợp lệ.");
            }
        } catch (error) {
            console.error("Lỗi tìm kiếm:", error);
            setSearchError(error.response?.data?.message || "Lỗi kết nối server.");
        } finally {
            setLoadingSearch(false);
        }
    };

    // --- XỬ LÝ INPUT & SUBMIT (Giữ nguyên) ---
    
    const handleInputChange = (maBanSao, field, value) => {
        setProcessState(prev => ({
            ...prev,
            [maBanSao]: {
                ...prev[maBanSao],
                [field]: value
            }
        }));
    };

    const handleSubmitReturn = async () => {
        const itemsToReturn = booksList
            .filter(book => processState[book.MaBanSao]?.isSelected)
            .map(book => {
                const state = processState[book.MaBanSao];
                return {
                    maBanSao: book.MaBanSao,
                    isHuHong: state.isDamaged,
                    // 🔥 FIX: Đảm bảo tiền phạt không âm
                    tienPhat: Math.max(0, parseInt(state.fine) || 0),
                    tienDenBu: 0, 
                    lyDo: state.note + (state.isDamaged ? " (Hư hỏng)" : "")
                };
            });

        if (itemsToReturn.length === 0) {
            window.alert("⚠️ Vui lòng tích chọn ít nhất 1 cuốn sách để trả.");
            return;
        }

        // Tính tổng tiền hiển thị confirm
        const totalFine = itemsToReturn.reduce((sum, item) => sum + item.tienPhat, 0);

        if (!window.confirm(`❓ Xác nhận trả ${itemsToReturn.length} cuốn sách?\n💰 Tổng tiền phạt thu: ${formatCurrency(totalFine)}`)) {
            return;
        }

        try {
            const res = await returnBook({
                maMuon: borrowInfo.MaMuon,
                sachTra: itemsToReturn
            });
            
            window.alert(`✅ ${res.data?.message || "Trả sách thành công!"}`);
            
            // Reset form
            setBorrowInfo(null);
            setBooksList([]);
            setSearchKeyword("");
            setProcessState({});
            fetchActiveLoansList(""); // Load lại danh sách active

        } catch (error) {
            console.error("Lỗi trả sách:", error);
            window.alert("❌ Lỗi: " + (error.response?.data?.message || "Không thể xử lý trả sách."));
        }
    };

    // --- RENDER CHÍNH ---

    // Quyết định giao diện hiển thị: Form xử lý hay Danh sách
    const isProcessing = borrowInfo && booksList.length > 0;
    
    return (
        <Layout>
            <div className="return-container">
                <h2 className="page-title">🔄 Quản lý Trả Sách & Thu Phạt</h2>

                {/* --- KHUNG TÌM KIẾM (Luôn hiển thị) --- */}
                <div className="search-section">
                    <form onSubmit={handleSearch} className="search-form">
                        <input 
                            type="text" 
                            placeholder={isProcessing ? borrowInfo.MaMuon : "Nhập Mã Phiếu Mượn để xử lý ngay..."} 
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            className="search-input"
                        />
                        <button type="submit" className="btn-search" disabled={loadingSearch}>
                            {loadingSearch ? "⏳ Đang tìm..." : "🔍 Tìm phiếu"}
                        </button>
                        {isProcessing && (
                            <button type="button" className="btn-secondary" onClick={() => { 
                                setBorrowInfo(null); 
                                setSearchKeyword("");
                                fetchActiveLoansList(""); 
                            }}>
                                &larr; Trở về List
                            </button>
                        )}
                    </form>
                    {searchError && <p className="error-msg">{searchError}</p>}
                </div>
                
                {/* --- GIAO DIỆN XỬ LÝ (Processing View) --- */}
                {isProcessing ? (
                    <>
                        <div className="borrow-info-card">
                            <div className="info-grid">
                                <div className="info-item"><span className="label">Mã Phiếu:</span> <span className="value highlight">{borrowInfo.MaMuon}</span></div>
                                <div className="info-item"><span className="label">Độc giả:</span> <span className="value">{borrowInfo.DocGia}</span></div>
                                <div className="info-item"><span className="label">Trạng thái:</span> <span className={`badge ${borrowInfo.TrangThai}`}>{borrowInfo.TrangThai}</span></div>
                                <div className="info-item"><span className="label">Ngày mượn:</span> <span className="value">{new Date(borrowInfo.NgayMuon).toLocaleDateString('vi-VN')}</span></div>
                                <div className="info-item"><span className="label">Hạn trả:</span> <span className="value text-red">{new Date(borrowInfo.HanTra).toLocaleDateString('vi-VN')}</span></div>
                            </div>
                        </div>

                        {/* BẢNG XỬ LÝ SÁCH (booksList) */}
                        <div className="process-section">
                            <h3 className="section-title">Danh sách sách cần trả</h3>
                            <div className="table-responsive">
                                <table className="return-table">
                                    <thead>
                                        <tr>
                                            <th className="text-center" width="50">Chọn</th>
                                            <th>Mã Bản Sao</th>
                                            <th>Tên Sách</th>
                                            <th className="text-center" width="80">Hư hỏng?</th>
                                            <th width="150">Phạt (VNĐ)</th>
                                            <th>Ghi chú</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {booksList.map(book => {
                                            const state = processState[book.MaBanSao] || {};
                                            const isRowActive = state.isSelected;
                                            
                                            return (
                                                <tr key={book.MaBanSao} className={isRowActive ? "row-selected" : ""}>
                                                    <td className="text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            className="checkbox-lg"
                                                            checked={state.isSelected}
                                                            onChange={(e) => handleInputChange(book.MaBanSao, 'isSelected', e.target.checked)}
                                                        />
                                                    </td>
                                                    <td><span className="code-badge">{book.MaBanSao}</span></td>
                                                    <td>{book.TenSach}</td>
                                                    <td className="text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            className="checkbox-md"
                                                            disabled={!isRowActive}
                                                            checked={state.isDamaged}
                                                            onChange={(e) => handleInputChange(book.MaBanSao, 'isDamaged', e.target.checked)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input 
                                                            type="number" 
                                                            className="input-money"
                                                            placeholder="0"
                                                            disabled={!isRowActive}
                                                            value={state.fine}
                                                            onChange={(e) => handleInputChange(book.MaBanSao, 'fine', e.target.value)}
                                                            min="0"
                                                            step="1000"
                                                        />
                                                    </td>
                                                    <td>
                                                        <input 
                                                            type="text" 
                                                            className="input-note"
                                                            placeholder={state.isDamaged ? "Mô tả hư hỏng..." : "Ghi chú..."}
                                                            disabled={!isRowActive}
                                                            value={state.note}
                                                            onChange={(e) => handleInputChange(book.MaBanSao, 'note', e.target.value)}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="action-footer">
                                <div className="summary-text">
                                    Đã chọn: <b>{booksList.filter(b => processState[b.MaBanSao]?.isSelected).length}</b> cuốn
                                </div>
                                <button className="btn-confirm" onClick={handleSubmitReturn}>
                                    ✅ Xác nhận Trả Sách
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    // --- GIAO DIỆN DANH SÁCH MẶC ĐỊNH (List View) ---
                    <ActiveLoanList 
                        onSelectOrder={handleSelectFromList} 
                        onKeywordChange={setListSearchKeyword} 
                        list={activeLoans} 
                        loadingList={loadingList} 
                    />
                )}
            </div>
        </Layout>
    );
}