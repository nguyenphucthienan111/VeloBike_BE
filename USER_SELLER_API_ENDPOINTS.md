# VeloBike API Endpoints (User + Seller)

Base URL: /api
Updated: 2026-03-16

## Quy ước quyền truy cập
- Public: không cần token
- User: cần Bearer token (mọi role đã đăng nhập)
- Buyer only: chỉ BUYER
- Seller only: chỉ SELLER
- Buyer/Seller: BUYER hoặc SELLER
- Webhook only: endpoint cho dịch vụ ngoài gọi, không gọi từ app
- Dev/Test only: endpoint chỉ dùng local/dev/test

## Authentication
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| POST | /auth/register | Public | Đăng ký |
| POST | /auth/verify-email | Public | Xác thực email OTP |
| POST | /auth/login | Public | Đăng nhập email/password |
| POST | /auth/google | Public | Google OAuth |
| POST | /auth/facebook | Public | Facebook OAuth |
| POST | /auth/change-password | User | Đổi mật khẩu |
| POST | /auth/forgot-password | Public | Quên mật khẩu |
| POST | /auth/reset-password | Public | Reset mật khẩu |
| POST | /auth/refresh-token | Public | Refresh access token |
| POST | /auth/logout | Public | Logout theo refresh token |
| POST | /auth/logout-all | User | Logout mọi session |
| GET | /auth/sessions | User | Danh sách session đang hoạt động |
| POST | /auth/kyc-submit | User | Nộp KYC dạng data thường |
| POST | /auth/kyc-upload | User | Nộp KYC có file upload |

## KYC
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| POST | /kyc/submit | User | eKYC với idCardFront + selfie |
| GET | /kyc/my-status | User | Xem trạng thái KYC hiện tại |
| POST | /kyc/webhook | Webhook only | Callback từ nhà cung cấp eKYC |

## User Profile
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| GET | /users/me | User | Hồ sơ hiện tại |
| PUT | /users/me | User | Cập nhật hồ sơ |
| GET | /users/:id | Public | Public profile |
| POST | /users/me/bank | User | Cập nhật tài khoản ngân hàng |
| GET | /users/me/wallet | User | Xem ví |
| POST | /users/me/upgrade-to-seller | Buyer only | Nâng cấp BUYER -> SELLER |

## Listings
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| GET | /listings | Public | Danh sách tin đăng |
| GET | /listings/featured | Public | Tin nổi bật |
| GET | /listings/nearby | Public | Tìm quanh vị trí |
| GET | /listings/search/advanced | Public | Tìm nâng cao |
| GET | /listings/search/suggestions | Public | Gợi ý tìm kiếm |
| GET | /listings/search/facets | Public | Facet/filter |
| GET | /listings/:id | Public | Chi tiết tin |
| GET | /listings/my-listings | Seller only | Tin của seller |
| POST | /listings | Seller only | Tạo tin |
| PUT | /listings/:id | Seller only | Sửa tin |
| DELETE | /listings/:id | Seller only | Xóa tin |
| POST | /listings/search/save | User | Lưu tìm kiếm |
| POST | /listings/fit-calculator | Public | Tính fit size xe |
| PUT | /listings/:id/submit-approval | Seller only | Gửi duyệt tin |
| PUT | /listings/:id/view | Public | Tăng lượt xem |
| POST | /listings/:id/boost | Seller only | Boost tin |

## Orders
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| POST | /orders | Buyer only | Tạo đơn |
| GET | /orders | Buyer/Seller | Danh sách đơn của tôi |
| GET | /orders/:id | Buyer/Seller | Chi tiết đơn |
| GET | /orders/:id/timeline | Buyer/Seller | Timeline đơn |
| PUT | /orders/:id/status | Buyer/Seller | Cập nhật trạng thái |
| PUT | /orders/:id/shipping-address | Buyer only | Cập nhật địa chỉ giao hàng |
| GET | /orders/:id/escrow-status | Buyer/Seller | Trạng thái escrow |
| POST | /orders/:id/transition | Buyer/Seller | FSM transition |

## Payment
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| POST | /payment/create-link | Buyer/Seller | Tạo link PayOS |
| POST | /payment/webhook | Webhook only | PayOS callback |
| GET | /payment/info/:orderCode | User | Lấy info thanh toán |
| POST | /payment/simulate-payment | Dev/Test only | Giả lập thanh toán |

## Messaging
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| GET | /messages/conversation/:userId | User | Lấy/tạo hội thoại |
| POST | /messages | User | Gửi tin nhắn |
| GET | /messages/list/:conversationId | User | Danh sách tin nhắn |
| GET | /messages/conversations | User | Danh sách hội thoại |
| GET | /messages/unread | User | Số tin chưa đọc |
| PUT | /messages/:messageId/read | User | Đánh dấu đã đọc |
| DELETE | /messages/:messageId | User | Xóa tin nhắn |
| PUT | /messages/conversation/:conversationId/close | User | Đóng hội thoại |

## Notifications
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| GET | /notifications | User | Danh sách thông báo |
| PUT | /notifications/read-all | User | Đánh dấu tất cả đã đọc |
| PUT | /notifications/:id/read | User | Đánh dấu 1 thông báo |

## Wishlist
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| POST | /wishlist | User | Thêm wishlist |
| GET | /wishlist | User | Danh sách wishlist |
| GET | /wishlist/check/:listingId | User | Kiểm tra đã lưu chưa |
| GET | /wishlist/count | User | Đếm wishlist |
| DELETE | /wishlist/clear | User | Xóa toàn bộ wishlist |
| DELETE | /wishlist/:listingId | User | Xóa 1 item wishlist |

## Reviews
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| POST | /reviews | Buyer only | Tạo review |
| GET | /reviews/:userId | Public | Lấy review của user |

## Upload
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| GET | /upload/my-images | User | Ảnh đã upload |
| POST | /upload | User | Upload ảnh đơn |
| POST | /upload/360 | User | Upload bộ ảnh 360 |
| DELETE | /upload/:publicId | User | Xóa ảnh |

## Subscriptions
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| GET | /subscriptions/plans | Public | Danh sách gói |
| GET | /subscriptions/my-subscription | Seller only | Gói hiện tại |
| GET | /subscriptions/check-quota | Seller only | Check quota tin |
| POST | /subscriptions/create-payment-link | Seller only | Tạo link thanh toán gói |
| POST | /subscriptions/subscribe | Seller only | Đăng ký gói |
| POST | /subscriptions/test-payment-success | Dev/Test only | Giả lập thanh toán gói |
| POST | /subscriptions/webhook | Webhook only | PayOS callback gói |

## Analytics (Seller)
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| GET | /analytics/seller/dashboard | Seller only | Tổng quan seller |
| GET | /analytics/seller/performance | Seller only | Hiệu năng seller |
| GET | /analytics/listing/:id | Seller only | Analytics theo tin |

## Wallet
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| POST | /wallet/withdraw | User | Tạo yêu cầu rút tiền |
| GET | /wallet/withdrawals | User | Lịch sử rút tiền |
| PUT | /wallet/withdrawals/:id/cancel | User | Hủy yêu cầu rút tiền |

## Alerts
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| POST | /alerts/price | User | Tạo price alert |
| GET | /alerts/price | User | Danh sách price alert |
| DELETE | /alerts/price/:id | User | Xóa price alert |
| POST | /alerts/saved-search | User | Lưu search |
| GET | /alerts/saved-search | User | Danh sách search đã lưu |
| PUT | /alerts/saved-search/:id | User | Sửa saved search |
| DELETE | /alerts/saved-search/:id | User | Xóa saved search |

## Disputes
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| GET | /disputes | Buyer/Seller | Danh sách dispute của tôi |
| POST | /disputes | Buyer/Seller | Mở dispute |
| GET | /disputes/:disputeId | Buyer/Seller | Chi tiết dispute |
| POST | /disputes/:disputeId/evidence | Buyer/Seller | Bổ sung bằng chứng |

## Recommendations
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| GET | /recommendations/bikes | User | Gợi ý cá nhân hóa |
| GET | /recommendations/similar/:listingId | Public | Sản phẩm tương tự |
| GET | /recommendations/trending | Public | Xu hướng |
| GET | /recommendations/price-prediction/:listingId | Public | Dự đoán giá |

## Logistics
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| POST | /logistics/calculate-fee | Public | Tính phí ship |
| POST | /logistics/create-shipment | Seller only | Tạo vận đơn |
| GET | /logistics/tracking/:trackingNumber | Public | Tracking |

## Chatbot
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| POST | /chatbot/webhook | Public/User | optionalAuth |
| GET | /chatbot/history | User | Lịch sử chat |
| GET | /chatbot/quota | User | Hạn mức chat |

## Transactions
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| GET | /transactions/my-transactions | User | Lịch sử giao dịch |
| GET | /transactions/:id | User | Chi tiết giao dịch |
| GET | /transactions/stats | User | Thống kê giao dịch |

## Reports
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| POST | /reports/listing | User | Report listing |
| GET | /reports/my-reports | User | Report của tôi |

## Dashboard
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| GET | /dashboard/seller/analytics | Seller only | Dashboard seller |
| GET | /dashboard/seller/performance | Seller only | Hiệu năng seller |
| GET | /dashboard/seller/inventory | Seller only | Tồn kho seller |
| GET | /dashboard/buyer/history | Buyer only | Lịch sử buyer |
| GET | /dashboard/buyer/saved-searches | Buyer only | Saved searches của buyer |
| GET | /dashboard/buyer/price-alerts | Buyer only | Price alerts của buyer |
| GET | /dashboard/buyer/recommendations | Buyer only | Gợi ý cho buyer |

## Bulk (Seller)
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| PUT | /bulk/listings/update-status | Seller only | Bulk update status |
| DELETE | /bulk/listings/delete | Seller only | Bulk delete |
| PUT | /bulk/listings/update-price | Seller only | Bulk update price |
| GET | /bulk/export/listings | Seller only | Export listings |
| GET | /bulk/export/orders | Seller only | Export orders |

## Brands và Categories
| Method | Endpoint | Access | Ghi chú |
|---|---|---|---|
| GET | /brands | Public | Danh sách brands |
| GET | /brands/popular | Public | Brands phổ biến |
| GET | /brands/:id | Public | Chi tiết brand |
| GET | /brands/:id/stats | Public | Stats brand |
| GET | /categories | Public | Danh sách categories |
| GET | /categories/:id | Public | Chi tiết category |

## Payment thay đổi mới so với doc mobile cũ
- Thêm GET /payment/info/:orderCode
- Thêm POST /payment/simulate-payment (dev)
- /payment/create-link hiện cho Buyer và Seller
