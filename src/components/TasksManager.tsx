import React, { useState } from 'react';
import { Task } from '../types';
import { Plus, Trash, Check, Clock, Calendar, Filter, CheckCircle2 } from 'lucide-react';
import { saveTask, removeTask } from '../storageUtils';

interface TasksManagerProps {
  tasks: Task[];
  onTasksUpdated: (tasks: Task[]) => void;
  subjects: string[];
}

export const TasksManager: React.FC<TasksManagerProps> = ({ tasks, onTasksUpdated, subjects }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState(subjects[0] || 'General Study');
  const [dueDate, setDueDate] = useState('');
  const [studyTime, setStudyTime] = useState(30);
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      completed: false,
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      subject,
      studyTime: Number(studyTime) || 30,
      createdAt: new Date().toISOString(),
    };

    await saveTask(newTask);
    onTasksUpdated([...tasks, newTask]);

    setTitle('');
    setDescription('');
    setDueDate('');
    setShowAddForm(false);
  };

  const handleToggleComplete = async (task: Task) => {
    const updatedTask = { ...task, completed: !task.completed };
    await saveTask(updatedTask);
    onTasksUpdated(tasks.map((t) => (t.id === task.id ? updatedTask : t)));
  };

  const handleDelete = async (id: string) => {
    await removeTask(id);
    onTasksUpdated(tasks.filter((t) => t.id !== id));
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSubject = filterSubject === 'All' || t.subject === filterSubject;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'completed' && t.completed) ||
      (filterStatus === 'pending' && !t.completed);
    return matchesSubject && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Filters and Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Filter size={16} /> Filters:
          </div>
          <select
            id="task-filter-subject"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-600 focus:outline-none"
          >
            <option value="All">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
            {(['all', 'pending', 'completed'] as const).map((status) => (
              <button
                key={status}
                id={`task-filter-status-${status}`}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                  filterStatus === status ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        <button
          id="btn-show-add-task"
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Add Task Form Overlay/Inline */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Add New Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Title</label>
              <input
                id="task-title"
                type="text"
                placeholder="What do you need to study?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Subject</label>
              <select
                id="task-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              >
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Estimated Duration (mins)</label>
              <input
                id="task-duration"
                type="number"
                min="5"
                max="480"
                value={studyTime}
                onChange={(e) => setStudyTime(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500">Due Date</label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500">Description</label>
            <textarea
              id="task-desc"
              placeholder="Additional notes or topics to cover..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none min-h-[80px]"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              id="btn-cancel-add-task"
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-500 hover:text-slate-900 px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              id="btn-submit-add-task"
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-colors"
            >
              Add Task
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
            <CheckCircle2 size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">No tasks found</p>
            <p className="text-xs text-slate-400 mt-1">Change your filters or create a new task to get started!</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              id={`task-item-${task.id}`}
              className={`bg-white border border-slate-100 rounded-2xl p-5 shadow-sm transition-all flex items-start gap-4 hover:border-slate-200 ${
                task.completed ? 'opacity-70' : ''
              }`}
            >
              <button
                id={`btn-task-toggle-${task.id}`}
                onClick={() => handleToggleComplete(task)}
                className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                  task.completed
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-slate-300 hover:border-indigo-500 text-transparent'
                }`}
              >
                <Check size={14} className={task.completed ? 'opacity-100' : 'opacity-0'} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <h4
                    className={`font-semibold text-slate-900 text-sm ${
                      task.completed ? 'line-through text-slate-400' : ''
                    }`}
                  >
                    {task.title}
                  </h4>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-slate-200">
                      {task.subject}
                    </span>
                  </div>
                </div>
                {task.description && (
                  <p className={`text-xs text-slate-500 mt-1.5 ${task.completed ? 'line-through text-slate-400' : ''}`}>
                    {task.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-slate-400 text-[11px] font-medium">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {task.studyTime} mins
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> Due: {task.dueDate}
                  </span>
                </div>
              </div>
              <button
                id={`btn-task-delete-${task.id}`}
                onClick={() => handleDelete(task.id)}
                className="text-slate-400 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 transition-colors flex-shrink-0"
                title="Delete Task"
              >
                <Trash size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
