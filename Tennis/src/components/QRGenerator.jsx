import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Download, X, Map as MapIcon, Trophy } from 'lucide-react';

const QRGenerator = ({ tournamentId, tournamentName, courts = [] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('tournament');
    const [selectedCourt, setSelectedCourt] = useState(courts[0] || 1);

    const baseUrl = window.location.origin;
    const tournamentUrl = `${baseUrl}/tournament/${tournamentId}`;
    const courtUrl = `${baseUrl}/tournament/${tournamentId}/court/${selectedCourt}`;
    const activeUrl = activeTab === 'tournament' ? tournamentUrl : courtUrl;
    const activeLabel = activeTab === 'tournament' ? tournamentName : `Court ${selectedCourt}`;

    const handleDownload = () => {
        const svg = document.getElementById('qr-svg');
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeLabel.replace(/ /g, '_')}_QR.svg`;
        a.click();
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl border border-slate-700 text-sm font-bold transition-all"
            >
                <QrCode size={18} className="text-primary-400" /> Generate QR Codes
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full relative z-10 shadow-2xl space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold">QR Code Generator</h3>
                                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-800 rounded-full">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 bg-slate-800 p-1 rounded-xl">
                                {[['tournament', Trophy, 'Tournament'], ['court', MapIcon, 'Court']].map(([val, Icon, label]) => (
                                    <button
                                        key={val}
                                        onClick={() => setActiveTab(val)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === val ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        <Icon size={16} /> {label}
                                    </button>
                                ))}
                            </div>

                            {/* Court Selector */}
                            {activeTab === 'court' && courts.length > 0 && (
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Select Court</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {courts.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setSelectedCourt(c)}
                                                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${selectedCourt === c ? 'border-primary-500 bg-primary-900/30 text-primary-400' : 'border-slate-700 text-slate-400'}`}
                                            >
                                                Court {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* QR Display */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="bg-white p-5 rounded-2xl">
                                    <QRCodeSVG
                                        id="qr-svg"
                                        value={activeUrl}
                                        size={180}
                                        level="H"
                                        includeMargin={false}
                                    />
                                </div>
                                <p className="text-xs text-center text-slate-500 font-mono break-all">{activeUrl}</p>
                                <p className="text-sm font-bold text-slate-300">{activeLabel}</p>
                            </div>

                            <button
                                onClick={handleDownload}
                                className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 py-3 rounded-xl font-bold transition-all"
                            >
                                <Download size={18} /> Download QR Code (SVG)
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default QRGenerator;
