const notFoundPage = () => {
    return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-lg">ไม่พบหน้าที่ต้องการ</p>
      <a href="/" className="mt-4 text-blue-500 hover:underline">
        กลับหน้าแรก
      </a>
    </div>
    )
  }
  export default notFoundPage