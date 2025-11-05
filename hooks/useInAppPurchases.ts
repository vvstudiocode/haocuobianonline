/**
 * @file useInAppPurchases.ts
 * @description Manages in-app purchases using the RevenueCat Capacitor plugin.
 * This hook encapsulates all IAP logic, including initialization,
 * purchasing, restoring, and checking premium status.
 */
import React from 'react';
import { Capacitor } from '@capacitor/core';
import {
  Purchases,
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from '@revenuecat/purchases-capacitor';

const { useState, useCallback } = React;

// --- PLACEHOLDER CONFIGURATION ---
// 提示：請將此處替換為您自己的 RevenueCat API 金鑰和方案 ID。
const REVENUECAT_API_KEY_IOS = 'test_udoFjWljwQpAKNXaaPkqsWaftYw';
const REVENUECAT_API_KEY_ANDROID = 'test_udoFjWljwQpAKNXaaPkqsWaftYw';
const PREMIUM_ENTITLEMENT_ID = 'pro'; // 您在 RevenueCat 後台設定的 Entitlement ID

export const useInAppPurchases = (
    setIsPremiumUser: React.Dispatch<React.SetStateAction<boolean>>
) => {
    const [isInitialized, setIsInitialized] = useState(false);

    const checkPremiumStatus = useCallback((customerInfo: CustomerInfo | null) => {
        if (customerInfo?.entitlements.active[PREMIUM_ENTITLEMENT_ID]) {
            setIsPremiumUser(true);
            console.log('使用者擁有尊榮會員資格。');
        } else {
            setIsPremiumUser(false);
            console.log('使用者沒有尊榮會員資格。');
        }
    }, [setIsPremiumUser]);

    const initPurchases = useCallback(async () => {
        if (!Capacitor.isNativePlatform()) {
            console.log('應用程式內購買功能僅適用於原生 App。');
            return;
        }

        try {
            const apiKey = Capacitor.getPlatform() === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
            
            // 開發時可設定日誌等級以便除錯
            await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

            await Purchases.configure({
              apiKey,
              // 您也可以選擇提供 appUserID，否則系統會自動生成一個。
            });
            
            setIsInitialized(true);
            console.log('RevenueCat SDK 初始化成功。');

            // 檢查初始會員狀態
            // FIX: The `getCustomerInfo` method returns a result object containing the customer info,
            // similar to other RevenueCat methods. Access the `customerInfo` property from the result.
            const customerInfoResult = await Purchases.getCustomerInfo();
            checkPremiumStatus(customerInfoResult);

        } catch (e) {
            console.error('初始化 RevenueCat SDK 失敗:', e);
        }
    }, [checkPremiumStatus]);

    const purchasePremium = useCallback(async () => {
        if (!isInitialized) {
            alert('購買服務尚未準備就緒，請稍後再試。');
            return;
        }

        try {
            const { current } = await Purchases.getOfferings();
            if (current && current.availablePackages.length > 0) {
                // 假設您在 "default" offering 中只有一個可購買的 package
                const packageToPurchase = current.availablePackages[0];
                // FIX: Explicitly get the result and access .customerInfo to resolve type error.
                const purchaseResult = await Purchases.purchasePackage({ aPackage: packageToPurchase });

                alert('感謝您的支持！您已成功升級為尊榮會員。');
                checkPremiumStatus(purchaseResult.customerInfo);
            } else {
                alert('目前沒有可用的升級選項。');
            }
        } catch (e: any) {
            // 檢查使用者是否手動取消了購買流程
            if (!e.userCancelled) {
                console.error('購買失敗:', e);
                alert('購買過程中發生錯誤，請稍後再試。');
            }
        }
    }, [isInitialized, checkPremiumStatus]);

    const restorePurchases = useCallback(async () => {
        if (!isInitialized) {
            alert('購買服務尚未準備就緒，請稍後再試。');
            return;
        }

        try {
            const restoreResult = await Purchases.restorePurchases();
            const customerInfo = restoreResult.customerInfo;
            checkPremiumStatus(customerInfo);

            if (customerInfo?.entitlements.active[PREMIUM_ENTITLEMENT_ID]) {
                alert('您的購買項目已成功恢復！');
            } else {
                alert('找不到可恢復的購買項目。');
            }
        } catch (e) {
            console.error('恢復購買失敗:', e);
            alert('恢復購買時發生錯誤，請稍後再試。');
        }
    }, [isInitialized, checkPremiumStatus]);

    return {
        initPurchases,
        purchasePremium,
        restorePurchases,
    };
};
