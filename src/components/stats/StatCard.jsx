import React from 'react';
import { Card } from "@/components/ui/card";

export default function StatCard({ title, value, icon: Icon, color = "primary", subtitle, darkMode }) {
    const colorStyles = {
        primary: darkMode ? "bg-gray-700 text-[#f4d0a8]" : "bg-[#f4d0a8] text-[#b66c34]",
        secondary: darkMode ? "bg-gray-700 text-[#c98a54]" : "bg-[#e5b889] text-[#8f5428]",
    };

    return (
        <Card className={`p-6 hover:shadow-lg transition-shadow ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889] bg-white'}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>{title}</p>
                    <p className={`text-3xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{value}</p>
                    {subtitle && <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-xl ${colorStyles[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </Card>
    );
}