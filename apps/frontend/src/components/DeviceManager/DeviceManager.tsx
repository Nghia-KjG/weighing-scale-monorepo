import React, { useEffect, useState } from 'react';
import { getDevices, createDevice, updateDevice, deleteDevice, Device } from '../../services/deviceService';

// Types for the component
interface ScanDevice extends Device {
    isEditing?: boolean;
}

const DeviceManager: React.FC = () => {
    const [devices, setDevices] = useState<ScanDevice[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<Device | null>(null); // If null, it's add mode
    const [formData, setFormData] = useState({ Name: '', Address: '', Loai: '' });

    useEffect(() => {
        fetchDevices();
    }, []);

    const fetchDevices = async () => {
        try {
            setLoading(true);
            const data = await getDevices();
            setDevices(data);
        } catch (err) {
            setError('Không thể tải danh sách thiết bị.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setEditingDevice(null);
        setFormData({ Name: '', Address: '', Loai: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (device: Device) => {
        setEditingDevice(device);
        setFormData({ Name: device.Name, Address: device.Address, Loai: device.Loai || '' });
        setIsModalOpen(true);
    };

    const handleDelete = async (stt: number) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa thiết bị này?')) return;
        try {
            await deleteDevice(stt);
            setDevices(prev => prev.filter(d => d.STT !== stt));
        } catch (err) {
            alert('Lỗi khi xóa thiết bị');
            console.error(err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingDevice) {
                await updateDevice(editingDevice.STT, formData);
                setDevices(prev => prev.map(d => d.STT === editingDevice.STT ? { ...d, ...formData } : d));
            } else {
                const res = await createDevice(formData);
                // Assuming the API returns the created object or we refetch
                // If API returns created object with STT
                if (res && res.data) {
                    setDevices(prev => [...prev, res.data]);
                } else {
                    fetchDevices();
                }
            }
            setIsModalOpen(false);
        } catch (err) {
            alert('Lỗi khi lưu thiết bị');
            console.error(err);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 min-h-screen">
            {/* --- Header --- */}
            <div className="bg-white p-6 shadow-sm border-b border-gray-200">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-7xl mx-auto">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">
                        Quản Lý Thiết Bị
                    </h1>
                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Thêm Thiết Bị
                    </button>
                </div>
            </div>

            {/* --- Content --- */}
            <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">STT</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên Thiết Bị</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Loại</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Địa Chỉ (MAC)</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {devices.map((device, index) => (
                                        <tr key={device.STT} className="hover:bg-blue-50/50 transition-colors duration-150">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">#{device.STT}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{device.Name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{device.Loai}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono bg-gray-50 rounded px-2 w-fit">{device.Address}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleOpenEdit(device)}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-4 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Chỉnh sửa"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(device.STT)}
                                                    className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Xóa"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {devices.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                                                Chưa có thiết bị nào. Hãy thêm mới!
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* --- Modal --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all scale-100 p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">
                            {editingDevice ? 'Cập Nhật Thiết Bị' : 'Thêm Thiết Bị Mới'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Thiết Bị</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.Name}
                                    onChange={e => setFormData({ ...formData, Name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Ví dụ: Cân XX"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
                                <input
                                    type="text"
                                    value={formData.Loai}
                                    onChange={e => setFormData({ ...formData, Loai: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Ví dụ: Đầu cân"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Địa Chỉ (MAC)</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.Address}
                                    onChange={e => setFormData({ ...formData, Address: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Ví dụ: AB:CD:EF:GH:12:34"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
                                >
                                    {editingDevice ? 'Lưu Thay Đổi' : 'Thêm Mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeviceManager;
