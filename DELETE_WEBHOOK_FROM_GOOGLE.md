# 🚨 **حذف Webhook من Google Cloud**

---

## 🔴 **المشكلة:**

الـ Bot لسا يهاجم الـ webhook endpoint!

**السبب:** الـ webhook URL مسجل في Google Cloud Pub/Sub!

---

## ✅ **الحل:**

### **1. افتح Google Cloud Console:**

```
https://console.cloud.google.com/cloudpubsub/subscription/list
```

---

### **2. اختر الـ Project:**

```
nnh-ai-studio (أو اسم الـ project تبعك)
```

---

### **3. شوف الـ Subscriptions:**

```
- gmb-notifications-subscription
- أو أي subscription فيها "gmb" أو "notifications"
```

---

### **4. احذف الـ Subscription:**

```
1. كليك على الـ subscription
2. كليك على "DELETE"
3. أكد الحذف
```

---

### **5. احذف الـ Topic (اختياري):**

```
Topics → gmb-notifications-topic → DELETE
```

---

## 🔍 **التحقق:**

بعد الحذف، راقب الـ Logs:

```
✅ لا يوجد requests على /api/webhooks/gmb-notifications
✅ Attack توقف
```

---

## 📋 **Checklist:**

```
✅ حذف Webhook Endpoint من Code
✅ إضافة Middleware Block
⏳ حذف Subscription من Google Cloud
⏳ حذف Topic من Google Cloud (اختياري)
⏳ تحقق من Attack توقف
```

---

## 🚨 **مهم:**

**لا تعيد تفعيل الـ Webhook إلا بعد إضافة:**

1. ✅ Authentication (Pub/Sub Signature)
2. ✅ Rate Limiting
3. ✅ IP Whitelist
4. ✅ POST-only (reject GET)

---

**روح الآن على Google Cloud Console واحذف الـ Subscription! 🚨**

