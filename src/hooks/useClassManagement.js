import { useState, useEffect } from 'react';

const CLASSES_KEY = 'learnlink_classes';


export function useClassManagement(materials = []) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');

  // Load classes from localStorage on mount
  useEffect(() => {
    const stored = getStoredClasses();
    setClasses(stored);
  }, []);

  // Sync classes from materials to localStorage
  useEffect(() => {
    if (materials.length === 0) return;

    const storedClasses = getStoredClasses();
    const materialsClasses = materials
      .filter((m) => m.className)
      .map((m) => ({ name: m.className, color: m.classColor || '#3b82f6' }));

    const uniqueClasses = deduplicateClasses([...storedClasses, ...materialsClasses]);

    if (JSON.stringify(uniqueClasses) !== JSON.stringify(storedClasses)) {
      saveClasses(uniqueClasses);
      setClasses(uniqueClasses);
    }
  }, [materials]);

  const addNewClass = (name, color = '#3b82f6') => {
    if (!name || !name.trim()) {
      throw new Error('Class name cannot be empty.');
    }

    const trimmedName = name.trim();

    // Check length limits
    if (trimmedName.length > 50) {
      throw new Error('Class name cannot exceed 50 characters.');
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      throw new Error('Invalid color format. Use hex format (#RRGGBB).');
    }
    const updatedClasses = addClass(trimmedName, color);
    setClasses(updatedClasses);
    setSelectedClass(trimmedName);

    return trimmedName;
  };

  const removeClassLocally = (className) => {
    const updatedClasses = deleteClass(className);
    setClasses(updatedClasses);

    if (selectedClass === className) {
      setSelectedClass('');
    }

    return updatedClasses;
  };

  return {
    classes,
    selectedClass,
    setSelectedClass,
    addNewClass,
    removeClassLocally,
  };
}

// Helper functions
function getStoredClasses() {
  try {
    const stored = localStorage.getItem(CLASSES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load classes from localStorage:', error);
    return [];
  }
}

function saveClasses(classes) {
  try {
    localStorage.setItem(CLASSES_KEY, JSON.stringify(classes));
  } catch (error) {
    console.warn('Failed to save classes to localStorage:', error);
  }
}

function addClass(name, color = '#3b82f6') {
  const classes = getStoredClasses();
  const existingClass = classes.find((c) => c.name.toLowerCase() === name.toLowerCase());

  if (existingClass) {
    throw new Error(`Class "${existingClass.name}" already exists.`);
  }

  classes.push({ name, color });
  saveClasses(classes);
  return classes;
}

function deleteClass(name) {
  const classes = getStoredClasses().filter((c) => c.name !== name);
  saveClasses(classes);
  return classes;
}

function deduplicateClasses(classes) {
  const unique = [];
  const seen = new Set();

  for (const cls of classes) {
    if (cls.name && !seen.has(cls.name)) {
      seen.add(cls.name);
      unique.push(cls);
    }
  }

  return unique;
}
