const User = require("../models/User");
const Product = require("../models/Product");

async function seed() {
  const existingAdmin = await User.findByUsername("admin");
  if (!existingAdmin) {
    await User.create({
      username: "admin",
      password: "admin123",
      fullName: "Quản trị viên",
      phone: "0900000000",
      role: "admin",
    });
    console.log("✅ Đã tạo tài khoản admin (admin / admin123)");
  }

  const existingFarmer = await User.findByUsername("nongdan");
  if (!existingFarmer) {
    const farmerId = await User.create({
      username: "nongdan",
      password: "nongdan123",
      fullName: "Anh Nguyễn Văn A",
      phone: "0912345678",
      role: "farmer",
      taxCode: "0123456789",
      businessLicense: "GP-2026-001",
      businessType: "production",
    });
    // Tự xác thực tài khoản mẫu
    await User.setVerification(farmerId, "verified", 1);
    console.log(
      "✅ Đã tạo tài khoản nông dân (nongdan / nongdan123) — đã xác thực",
    );

    const pid = await Product.create({
      userId: farmerId,
      name: "Gạo ST25 hữu cơ",
      category: "Lúa gạo",
      variety: "ST25",
      batchCode: "ST25-2026-001",
      harvestDate: "2026-05-10",
      quantity: 500,
      unit: "kg",
      farmName: "Trại lúa Hòa Bình",
      farmAddress: "Ấp 1, xã Mỹ Long, huyện Gò Công Tây",
      province: "Tiền Giang",
      district: "Gò Công Tây",
      latitude: 10.3456,
      longitude: 106.6789,
      certifications: "VietGAP, Hữu cơ USDA",
      description: "Gạo ST25 thơm dẻo, canh tác theo tiêu chuẩn hữu cơ.",
      image: null,
      gtinCode: "8931234567890",
      glnCode: "8931234000007",
      plantingAreaCode: "TG-PA-001",
      facilityCode: "TG-FC-001",
    });
    // Tự duyệt sản phẩm mẫu
    await Product.submitForReview(pid, farmerId);
    await Product.approve(pid, 1);

    await Product.addStage({
      productId: pid,
      stageName: "Gieo sạ",
      stageOrder: 1,
      performedAt: "2025-12-01",
      description: "Gieo sạ giống ST25 đã được kiểm định.",
      image: null,
      location: "Trại lúa Hòa Bình",
    });
    await Product.addStage({
      productId: pid,
      stageName: "Chăm sóc",
      stageOrder: 2,
      performedAt: "2026-02-15",
      description: "Bón phân hữu cơ ủ hoai, không dùng thuốc hóa học.",
      image: null,
      location: "Trại lúa Hòa Bình",
    });
    await Product.addStage({
      productId: pid,
      stageName: "Thu hoạch",
      stageOrder: 3,
      performedAt: "2026-05-10",
      description: "Thu hoạch bằng máy, sấy khô và đóng bao 25kg.",
      image: null,
      location: "Trại lúa Hòa Bình",
    });

    console.log("✅ Đã tạo sản phẩm mẫu: ST25-2026-001");
  }

  console.log("\n🎉 Seed hoàn tất!");
  console.log("Đăng nhập admin: admin / admin123");
  console.log("Đăng nhập nông dân: nongdan / nongdan123");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
