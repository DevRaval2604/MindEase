import { useEffect, useState } from 'react';

function ManageSlots() {
    const [slots, setSlots] = useState([]);
    const [newSlot, setNewSlot] = useState({
        date: '',
        startTime: '',
        endTime: '',
        isAvailable: true
    });

    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('counsellorSlots') || '[]');
            setSlots(Array.isArray(saved) ? saved : []);
        } catch (_) {
            setSlots([]);
        }
    }, []);

    function handleAddSlot(e) {
        e.preventDefault();
        if (!newSlot.date || !newSlot.startTime || !newSlot.endTime) return;

        const slot = {
            id: Date.now(),
            ...newSlot,
            date: new Date(newSlot.date).toISOString().split('T')[0]
        };

        const updated = [...slots, slot];
        setSlots(updated);
        localStorage.setItem('counsellorSlots', JSON.stringify(updated));
        setNewSlot({ date: '', startTime: '', endTime: '', isAvailable: true });
    }

    function toggleSlot(id) {
        const updated = slots.map(slot =>
            slot.id === id ? { ...slot, isAvailable: !slot.isAvailable } : slot
        );
        setSlots(updated);
        localStorage.setItem('counsellorSlots', JSON.stringify(updated));
    }

    function deleteSlot(id) {
        const updated = slots.filter(slot => slot.id !== id);
        setSlots(updated);
        localStorage.setItem('counsellorSlots', JSON.stringify(updated));
    }

    return (
        <div className="flex h-screen">
            <aside className="w-60 shrink-0 border-r border-gray-200 p-4 hidden md:block sticky top-0 h-screen overflow-y-auto">
                <div className="font-semibold text-gray-900 mb-4">MindEase</div>
                <nav className="space-y-2 text-sm">
                    <a className="block px-3 py-2 rounded-md hover:bg-gray-50" href="/counsellor/dashboard">My Profile</a>
                    <a className="block px-3 py-2 rounded-md bg-blue-50 text-blue-700" href="/counsellor/manage-slots">Manage Slots</a>
                    <a className="block px-3 py-2 rounded-md hover:bg-gray-50" href="/counsellor/appointments">My Appointments</a>
                    <a className="block px-3 py-2 rounded-md hover:bg-gray-50" href="/counsellor/earnings">Earnings Summary</a>
                    <div className="mt-6 text-xs text-gray-500">Settings • Help</div>
                </nav>
            </aside>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Time Slots</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Slot</h2>
                        <form onSubmit={handleAddSlot} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={newSlot.date}
                                    onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                                    className="w-full p-2.5 border rounded-md"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                    <input
                                        type="time"
                                        value={newSlot.startTime}
                                        onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                                        className="w-full p-2.5 border rounded-md"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                    <input
                                        type="time"
                                        value={newSlot.endTime}
                                        onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                                        className="w-full p-2.5 border rounded-md"
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-2.5 rounded-md hover:bg-blue-700"
                            >
                                Add Slot
                            </button>
                        </form>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Available Slots</h2>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {slots.length === 0 ? (
                                <p className="text-gray-500 text-sm">No slots added yet</p>
                            ) : (
                                slots.map(slot => (
                                    <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {new Date(slot.date).toLocaleDateString()}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {slot.startTime} - {slot.endTime}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleSlot(slot.id)}
                                                className={`px-3 py-1 text-xs rounded-full ${slot.isAvailable
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }`}
                                            >
                                                {slot.isAvailable ? 'Available' : 'Unavailable'}
                                            </button>
                                            <button
                                                onClick={() => deleteSlot(slot.id)}
                                                className="text-red-600 hover:text-red-800 text-sm"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ManageSlots;
