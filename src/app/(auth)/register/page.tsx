"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Mail, Lock, User, Building, Loader2, MessageCircle, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"
import { AnimatedBackground } from "@/components/auth/animated-background"

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    organizationName: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Step 1: Sign up user (ไม่สร้าง org ตอนนี้)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        },
      })

      if (authError) throw authError

      // Step 2: Create user record (without organization)
      if (authData.user) {
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: formData.email,
            name: formData.fullName,
            role: 'admin', // Default role in users table
            is_active: true,
            language: 'th',
            timezone: 'Asia/Bangkok',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (userError && userError.code !== '23505') { // Ignore duplicate error
          console.error('Error creating user record:', userError)
        }
      }

      // Show success message
      setStep(3)
      
      // Redirect to organization selection page
      setTimeout(() => {
        router.push("/organizations") // จะสร้างหน้านี้ใหม่
      }, 2000)
    } catch (error: any) {
      console.error('Registration error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const benefits = [
    "ทดลองใช้ฟรี 14 วัน",
    "ไม่ต้องใช้บัตรเครดิต",
    "รองรับทุกแพลตฟอร์ม",
    "ทีมสนับสนุนภาษาไทย",
  ]

  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBackground />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="bg-card/80 backdrop-blur-xl p-8 rounded-2xl border shadow-xl text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">สมัครสมาชิกสำเร็จ!</h2>
          <p className="text-muted-foreground">กำลังพาคุณไปยังแดชบอร์ด...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex relative">
      <AnimatedBackground />
      
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          {/* Logo and Title */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl mb-4 shadow-lg"
            >
              <MessageCircle className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
              สมัครใช้งาน AooChat
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              เริ่มต้นจัดการแชทอย่างมืออาชีพ
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 text-xs sm:text-sm"
              >
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{benefit}</span>
              </motion.div>
            ))}
          </div>

          {/* Register Form */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-card/80 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border shadow-xl"
          >
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= 1 ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  1
                </div>
                <div className={`w-16 h-1 transition-colors ${
                  step >= 2 ? 'bg-brand-500' : 'bg-gray-200'
                }`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= 2 ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  2
                </div>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                >
                  {error}
                </motion.div>
              )}

              {step === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      ชื่อ-นามสกุล
                    </label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500 transition-colors" />
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl bg-background/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      ชื่อองค์กร/บริษัท
                    </label>
                    <div className="relative group">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500 transition-colors" />
                      <input
                        type="text"
                        name="organizationName"
                        value={formData.organizationName}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl bg-background/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                        placeholder="บริษัท ABC จำกัด"
                        required
                      />
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    onClick={() => setStep(2)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-lg sm:rounded-xl font-medium hover:from-brand-600 hover:to-brand-700 transition-all shadow-lg"
                  >
                    ถัดไป
                  </motion.button>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      อีเมล
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500 transition-colors" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl bg-background/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      รหัสผ่าน
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500 transition-colors" />
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl bg-background/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      ยืนยันรหัสผ่าน
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500 transition-colors" />
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl bg-background/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg sm:rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                    >
                      ย้อนกลับ
                    </button>
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-lg sm:rounded-xl font-medium hover:from-brand-600 hover:to-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          กำลังสมัคร...
                        </span>
                      ) : (
                        "สมัครสมาชิก"
                      )}
                    </motion.button>
                  </div>
                </>
              )}
            </form>

            <div className="mt-6 text-center">
              <span className="text-sm text-muted-foreground">
                มีบัญชีแล้ว?{" "}
              </span>
              <Link
                href="/login"
                className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors"
              >
                เข้าสู่ระบบ
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}