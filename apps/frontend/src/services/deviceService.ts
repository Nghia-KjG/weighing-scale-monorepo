import apiClient from '../api/apiClient';

export interface Device {
    STT: number;
    Name: string;
    Address: string;
    Loai?: string;
}

export const getDevices = async (): Promise<Device[]> => {
    const response = await apiClient.get('/devices');
    return response.data;
};

export const createDevice = async (device: { Name: string; Address: string; Loai?: string }) => {
    const response = await apiClient.post('/devices', device);
    return response.data;
};

export const updateDevice = async (stt: number, device: { Name: string; Address: string; Loai?: string }) => {
    const response = await apiClient.put(`/devices/${stt}`, device);
    return response.data;
};

export const deleteDevice = async (stt: number) => {
    const response = await apiClient.delete(`/devices/${stt}`);
    return response.data;
};
