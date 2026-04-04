import React from 'react';
import { Card } from "@/components/ui/card";
import { Award, Star } from 'lucide-react';

const tierStyles = {
    bronze: "from-[#c98a54] to-[#8f5428] shadow-[#e5b889]",
    silver: "from-slate-400 to-slate-600 shadow-slate-200",
    gold: "from-[#f4d0a8] to-[#b66c34] shadow-[#f4d0a8]",
    platinum: "from-[#e5b889] to-[#c98a54] shadow-[#f4d0a8]"
};

export default function MedallionDisplay({ medallions, darkMode }) {
    if (!medallions || medallions.length === 0) {
        return (
            <Card className={`p-8 text-center ${darkMode ? 'bg-gray-700 border-gray-600' : 'border-[#e5b889]'}`}>
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-gray-600' : 'bg-[#f4d0a8]'}`}>
                    <Award className={`w-8 h-8 ${darkMode ? 'text-gray-400' : 'text-[#c98a54]'}`} />
                </div>
                <p className={darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}>No medallions earned yet</p>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-[#b5a090]'}`}>Keep discovering to earn achievements!</p>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {medallions.map((medallion) => (
                <Card 
                    key={medallion.id} 
                    className={`p-4 text-center hover:shadow-lg transition-all hover:-translate-y-1 ${darkMode ? 'bg-gray-700 border-gray-600' : 'border-[#e5b889]'}`}
                >
                    <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${tierStyles[medallion.tier]} flex items-center justify-center shadow-lg mb-3`}>
                        <Star className="w-8 h-8 text-white" />
                    </div>
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{medallion.name}</h4>
                    <p className="text-xs text-[#b66c34] mt-1 capitalize">{medallion.tier}</p>
                    <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>{medallion.description}</p>
                </Card>
            ))}
        </div>
    );
}