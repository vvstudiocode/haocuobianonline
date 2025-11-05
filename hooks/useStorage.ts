/**
 * @file useStorage.ts
 * @description
 * 自訂鉤子 (Custom Hook)，用於簡化與 LocalStorage 的互動。
 * - 接收一個儲存鍵 (key) 和一個預設值 (defaultValue)。
 * - 在初始化時從 LocalStorage 讀取資料，如果不存在則使用預設值。
 * - 使用 React State 來管理資料，使其具有響應性。
 * - 透過 useEffect 自動將任何狀態變更同步回 LocalStorage。
 * - 回傳一個與 useState 簽名相同的陣列 [value, setValue]，方便使用。
 */
import React from 'react';
import { getFromStorage, saveToStorage } from '../storage.ts';

const { useState, useEffect } = React;

export const useStorage = <T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [value, setValue] = useState<T>(() => {
        return getFromStorage(key, defaultValue);
    });

    useEffect(() => {
        saveToStorage(key, value);
    }, [key, value]);

    return [value, setValue];
};
