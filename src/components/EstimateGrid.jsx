import React from 'react';

const EstimateGrid = ({ items, onDelete, onUpdateQty }) => {
  return (
    <div className="overflow-x-auto border rounded-lg shadow-sm">
      <table className="min-w-full bg-white text-sm">
        <thead className="bg-gray-50 font-bold">
          <tr>
            <th className="p-2">Sr. No</th>
            <th className="p-2 text-left">Description</th>
            <th className="p-2">Qty</th>
            <th className="p-2">Rate</th>
            <th className="p-2">Total</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t hover:bg-gray-50">
              <td className="p-2 text-center">{item.serial}</td>
              <td className="p-2" style={{ paddingLeft: `${item.depth * 15}px` }}>
                {item.description}
              </td>
              <td className="p-2"><input type="number" value={item.qty} onChange={(e) => onUpdateQty(item.id, e.target.value)} className="w-16 border rounded"/></td>
              <td className="p-2 text-right">{item.rate}</td>
              <td className="p-2 text-right font-bold">{(item.qty * item.rate).toLocaleString()}</td>
              <td className="p-2 text-center">
                <button onClick={() => onDelete(item.id)} className="text-red-500">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
export default EstimateGrid;
