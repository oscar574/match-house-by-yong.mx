import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AdminTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pendiente');

  useEffect(() => {
    base44.entities.Task.list('-created_date', 50).then(t => {
      setTasks(t);
      setLoading(false);
    });
  }, []);

  const toggleComplete = async (id, current) => {
    const newStatus = current === 'Completada' ? 'Pendiente' : 'Completada';
    await base44.entities.Task.update(id, { status: newStatus });
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const filtered = filter === 'Todas' ? tasks : tasks.filter(t => t.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="font-heading text-2xl text-latitud-black mb-1">MatchHouse Tasks</h1>
      <p className="text-sm text-latitud-gray mb-5">{tasks.filter(t => t.status === 'Pendiente').length} pendientes</p>

      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        {['Pendiente', 'Completada', 'Vencida', 'Todas'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f ? 'bg-latitud-orange text-white' : 'bg-white text-latitud-gray border border-gray-100'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle size={32} className="text-latitud-gray/30 mx-auto mb-2" />
            <p className="text-sm text-latitud-gray">No hay tareas en esta categoría</p>
          </div>
        ) : (
          filtered.map(task => (
            <div key={task.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleComplete(task.id, task.status)}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    task.status === 'Completada' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                  }`}
                >
                  {task.status === 'Completada' && <CheckCircle size={12} className="text-white" />}
                </button>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${task.status === 'Completada' ? 'text-latitud-gray line-through' : 'text-latitud-black'}`}>
                    {task.title}
                  </p>
                  {task.description && <p className="text-xs text-latitud-gray mt-0.5">{task.description}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      task.priority === 'Alta' ? 'bg-red-50 text-red-500' :
                      task.priority === 'Media' ? 'bg-yellow-50 text-yellow-600' :
                      'bg-gray-100 text-latitud-gray'
                    }`}>{task.priority}</span>
                    <span className="text-[10px] text-latitud-gray">{task.task_type}</span>
                    {task.client_name && <span className="text-[10px] text-latitud-gray">· {task.client_name}</span>}
                    {task.due_date && <span className="text-[10px] text-latitud-gray flex items-center gap-0.5"><Clock size={8} /> {task.due_date}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}