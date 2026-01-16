import Link from "next/link"
import Image from "next/image"

export default function HomePage() {
  return (
    <div className="bg-white font-display text-slate-900 selection:bg-primary selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-header">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" fill="currentColor"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">CloudAdditive</h2>
          </div>
          <div className="hidden md:flex items-center gap-10">
            <a className="text-sm font-medium text-slate-900 hover:text-primary transition-colors" href="#services">Services</a>
            <a className="text-sm font-medium text-slate-900 hover:text-primary transition-colors" href="#materials">Materials</a>
            <a className="text-sm font-medium text-slate-900 hover:text-primary transition-colors" href="#pricing">Pricing</a>
            <a className="text-sm font-medium text-slate-900 hover:text-primary transition-colors" href="#about">About</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold px-4 py-2 rounded-xl text-slate-900 hover:bg-slate-100 transition-all">
              Login
            </Link>
            <Link href="/order" className="bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all">
              Start Order
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden hero-grid">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary glow-orb rounded-full"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyber-violet glow-orb rounded-full"></div>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="flex flex-col gap-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              NEXT-GEN ADDITIVE MANUFACTURING
            </div>
            <h1 className="text-5xl lg:text-7xl font-black leading-tight tracking-tight text-slate-900">
              Your Ideas,<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyber-violet">Printed in 3D</span>
            </h1>
            <p className="text-slate-500 text-lg lg:text-xl max-w-lg leading-relaxed">
              Fast, precise 3D printing services for B2C and B2B customers. From functional prototypes to volume production in over 30+ industrial materials.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/order" className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-xl shadow-primary/20">
                <span className="material-symbols-outlined">rocket_launch</span>
                Launch Builder
              </Link>
              <button className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 font-bold py-4 px-8 rounded-xl transition-all shadow-sm">
                View Samples
              </button>
            </div>
            <div className="flex items-center gap-6 mt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden shadow-sm" />
                ))}
              </div>
              <p className="text-sm text-slate-500 font-medium">Trusted by <span className="text-slate-900 font-bold">2,500+</span> engineers worldwide</p>
            </div>
          </div>
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-cyber-violet/10 rounded-3xl blur-2xl"></div>
            <div className="relative bg-white border border-slate-200 rounded-3xl p-4 overflow-hidden aspect-square flex items-center justify-center shadow-2xl shadow-slate-200/50">
              <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
                <svg className="w-32 h-32 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
              </div>
              <div className="absolute bottom-10 right-10 bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-slate-100 shadow-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-primary">precision_manufacturing</span>
                  <span className="text-xs font-bold text-slate-500">PRINT STATUS</span>
                </div>
                <div className="text-2xl font-mono text-slate-900 font-bold">98.4% <span className="text-sm text-primary">ACTIVE</span></div>
                <div className="mt-3 w-40 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-[98.4%]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos Section */}
      <section className="py-20 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <h4 className="text-slate-500 text-xs font-bold tracking-widest text-center mb-10 uppercase">Global Industry Leaders</h4>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="services" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Precision Workflow</h2>
            <p className="text-slate-500">Seamlessly move from design to physical reality in three simple steps.</p>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] dotted-connector opacity-10"></div>
            {[
              { num: "01", icon: "upload_file", title: "Upload CAD", desc: "Support for STL, OBJ, and STEP files. Instant geometry verification.", color: "primary" },
              { num: "02", icon: "settings_input_component", title: "Configure", desc: "Select material, density, and finish. Live preview your configuration.", color: "cyber-violet" },
              { num: "03", icon: "local_shipping", title: "Delivered", desc: "Quality controlled parts delivered to your door in as fast as 48 hours.", color: "indigo-500" },
            ].map((step) => (
              <div key={step.num} className="relative flex flex-col items-center text-center group">
                <div className="w-24 h-24 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-8 shadow-sm group-hover:shadow-md transition-shadow relative">
                  <span className="text-3xl font-black text-primary">{step.num}</span>
                  <div className={`absolute -top-3 -right-3 bg-${step.color} text-white p-2 rounded-lg shadow-lg`}>
                    <span className="material-symbols-outlined text-sm">{step.icon}</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-[240px]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instant Quote Section */}
      <section id="pricing" className="py-24 relative overflow-hidden bg-slate-50/50">
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Instant Quote Engine</h3>
                <p className="text-slate-500 text-sm">Get real-time pricing for your project.</p>
              </div>
              <div className="bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                <span className="text-xs font-mono text-primary font-bold">V2.4 ENGINE</span>
              </div>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <Link href="/order" className="border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:border-primary/50 hover:bg-white transition-all cursor-pointer group">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-3xl">cloud_upload</span>
                </div>
                <p className="text-slate-900 font-bold mb-1">Drop CAD file here</p>
                <p className="text-slate-500 text-xs">Supports STL, STEP, OBJ up to 50MB</p>
              </Link>
              <div className="flex flex-col gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Material Select</label>
                  <select className="w-full bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-primary focus:border-primary transition-all px-4 py-3">
                    <option>PLA Pro (Tough)</option>
                    <option>ABS Industrial</option>
                    <option>PETG Standard</option>
                    <option>TPU Flexible</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Quantity</label>
                    <input className="w-full bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-primary px-4 py-3" type="number" defaultValue="1" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Infill</label>
                    <select className="w-full bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-primary px-4 py-3">
                      <option>20% Standard</option>
                      <option>50% Heavy Duty</option>
                      <option>100% Solid</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">Estimated Total</span>
                <div className="text-4xl font-mono font-bold text-slate-900 mt-1">Rp 42.000 <span className="text-sm text-slate-500 font-normal">IDR</span></div>
              </div>
              <Link href="/order" className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white font-bold py-4 px-10 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                Continue to Checkout
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Materials Section */}
      <section id="materials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Engineering Materials</h2>
              <p className="text-slate-500">Scientifically tested polymers for every application.</p>
            </div>
            <a className="text-primary font-bold flex items-center gap-2 hover:gap-3 transition-all" href="#">
              View Data Sheets <span className="material-symbols-outlined">chevron_right</span>
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { name: "PLA Pro", tag: "Most Popular", tagColor: "green", icon: "polymer", iconColor: "primary", desc: "Excellent detail and dimensional accuracy. Best for prototypes and visual models.", strength: 70, flex: 20, heat: "55°C", heatPct: 40 },
              { name: "Nylon CF", tag: "Industrial", tagColor: "blue", icon: "precision_manufacturing", iconColor: "cyber-violet", desc: "Carbon fiber reinforced nylon. Incredible strength-to-weight ratio for end-use parts.", strength: 100, flex: 30, heat: "150°C", heatPct: 85 },
              { name: "TPU 95A", tag: "Soft Touch", tagColor: "amber", icon: "auto_fix_high", iconColor: "electric-indigo", desc: "Rubbery, flexible material. High abrasion resistance. Perfect for gaskets and footwear.", strength: 60, flex: 90, heat: "70°C", heatPct: 50 },
            ].map((material) => (
              <div key={material.name} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all group">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 bg-${material.iconColor}/10 rounded-xl flex items-center justify-center text-${material.iconColor}`}>
                    <span className="material-symbols-outlined">{material.icon}</span>
                  </div>
                  <span className={`px-3 py-1 bg-${material.tagColor}-100 text-${material.tagColor}-700 text-[10px] font-bold rounded-full uppercase`}>{material.tag}</span>
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">{material.name}</h4>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">{material.desc}</p>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                      <span>Strength</span>
                      <span className="text-slate-900">{material.strength / 10}/10</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="bg-primary h-full" style={{ width: `${material.strength}%` }}></div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                      <span>Flexibility</span>
                      <span className="text-slate-900">{material.flex / 10}/10</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="bg-primary h-full" style={{ width: `${material.flex}%` }}></div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                      <span>Heat Resistance</span>
                      <span className="text-slate-900">{material.heat}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="bg-primary h-full" style={{ width: `${material.heatPct}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-slate-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { quote: "The dimensional accuracy on our turbine prototypes was within 0.1mm. CloudAdditive is our new go-to for engineering validation.", name: "Marcus Chen", title: "CTO, NexaAero" },
              { quote: "Incredible material selection. Being able to order Nylon-CF and TPU in the same batch with consistent quality is a game changer.", name: "Sarah Jenkins", title: "Product Designer, LoopWear" },
              { quote: "The automated quoting system saved us days of back-and-forth emails. We went from CAD to physical part in 48 hours.", name: "David Miller", title: "Lead Engineer, Forge Robotics" },
            ].map((testimonial, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-6">
                <div className="flex gap-1 text-primary">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="material-symbols-outlined">star</span>
                  ))}
                </div>
                <p className="text-slate-500 italic">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200 border border-slate-100 shadow-sm" />
                  <div>
                    <h5 className="text-slate-900 font-bold text-sm">{testimonial.name}</h5>
                    <p className="text-slate-500 text-xs">{testimonial.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="bg-primary rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-primary/30">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-cyber-violet opacity-100"></div>
            <div className="absolute inset-0 hero-grid opacity-10"></div>
            <div className="relative z-10 flex flex-col items-center gap-8">
              <h2 className="text-4xl md:text-6xl font-black text-white max-w-2xl leading-tight">Ready to start your next project?</h2>
              <p className="text-white/80 text-lg max-w-xl">Join 2,500+ engineers building the future of hardware with CloudAdditive.</p>
              <div className="w-full max-w-md flex flex-col sm:flex-row gap-4">
                <input className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 outline-none" placeholder="Enter your email" type="email" />
                <Link href="/order" className="bg-white text-primary font-black px-10 py-4 rounded-2xl hover:bg-slate-50 transition-colors shadow-xl">
                  Get Started
                </Link>
              </div>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest">No credit card required to start a quote</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-20 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary p-2 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" fill="currentColor"></path>
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900">CloudAdditive</h2>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-xs">High-performance additive manufacturing on demand. Built for the modern engineer.</p>
          </div>
          <div>
            <h6 className="text-slate-900 font-bold text-sm mb-6">Service</h6>
            <ul className="space-y-4 text-sm text-slate-500">
              <li><a className="hover:text-primary transition-colors" href="#">Online Quoting</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">3D Printing</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Post Processing</a></li>
            </ul>
          </div>
          <div>
            <h6 className="text-slate-900 font-bold text-sm mb-6">Materials</h6>
            <ul className="space-y-4 text-sm text-slate-500">
              <li><a className="hover:text-primary transition-colors" href="#">PLA</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">ABS</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">PETG</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">TPU</a></li>
            </ul>
          </div>
          <div>
            <h6 className="text-slate-900 font-bold text-sm mb-6">Support</h6>
            <ul className="space-y-4 text-sm text-slate-500">
              <li><a className="hover:text-primary transition-colors" href="#">Help Center</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Shipping Policy</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h6 className="text-slate-900 font-bold text-sm mb-6">Company</h6>
            <ul className="space-y-4 text-sm text-slate-500">
              <li><a className="hover:text-primary transition-colors" href="#">About Us</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Careers</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-xs">© 2026 CloudAdditive Inc. All rights reserved.</p>
          <div className="flex gap-8 text-xs text-slate-500 font-mono">
            <span>LATENCY: 12ms</span>
            <span>NODE: ID-CGK-1</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

