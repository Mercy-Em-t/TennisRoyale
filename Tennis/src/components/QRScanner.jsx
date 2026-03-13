import React, { useState } from 'react';
import { QrCode, X, Search, Map as MapIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QRScanner = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [result, setResult] = useState('');

    const handleScan = (data) => {
        if (data) {
            setResult(data.text);
            setIsOpen(false);
        }
    };

    const handleError = (err) => {
        console.error(err);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 w-16 h-16 bg-primary-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-primary-500 hover:scale-110 active:scale-95 transition-all z-[60]"
            >
                <QrCode size={32} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsOpen(false)}></div>

                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-sm w-full relative z-10 shadow-2xl"
                        >
                            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-xl">Venue Scanner</h3>
                                    <p className="text-xs text-slate-500 uppercase tracking-widest">Scan Court or Tournament QR</p>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="aspect-square bg-slate-800 relative flex items-center justify-center p-8 text-center text-slate-500">
                                <div className="space-y-2">
                                    <QrCode size={48} className="mx-auto opacity-20" />
                                    <p className="text-xs font-mono lowercase">
                                        [ camera stream disabled ]<br />
                                        Ready for venue integration
                                    </p>
                                </div>
                                <div className="absolute inset-x-0 top-0 h-1 bg-primary-500 animate-scan shadow-[0_0_15px_rgba(14,165,233,0.5)]"></div>
                            </div>

                            <div className="p-8 text-center space-y-4">
                                <div className="flex items-center gap-4 justify-center">
                                    <div className="p-3 bg-slate-800 rounded-2xl">
                                        <Search className="text-slate-400" size={24} />
                                        <p className="text-[10px] mt-1 text-slate-500">Tournament</p>
                                    </div>
                                    <div className="p-3 bg-slate-800 rounded-2xl">
                                        <MapIcon className="text-slate-400" size={24} />
                                        <p className="text-[10px] mt-1 text-slate-500">Court</p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-400">Position the QR code within the frame to instantly route to the digital lobby or match screen.</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default QRScanner;
