"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { ContactShadows, Environment, Sparkles } from "@react-three/drei";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

const trustItems = [
  "El işçiliği kalite kontrol",
  "Sipariş sonrası canlı durum takibi",
  "Şeffaf kaplama fiyatlandırması",
];

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3l7 3v6c0 5-3.2 8.6-7 10-3.8-1.4-7-5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function LogoPendantMesh() {
  const groupRef = useRef<THREE.Group>(null);
  const baseObj = useLoader(OBJLoader, "/base.obj");

  const modelMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#d4af37",
        roughness: 0.18,
        metalness: 0.95,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        envMapIntensity: 2.4,
      }),
    [],
  );

  const model = useMemo(() => {
    const obj = baseObj.clone(true);

    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = modelMaterial;
        child.castShadow = true;
        child.receiveShadow = true;
        child.geometry.computeVertexNormals();
      }
    });

    const bounds = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bounds.getSize(size);
    bounds.getCenter(center);

    obj.position.sub(center);
    const targetHeight = 1.55;
    const scale = size.y > 0 ? targetHeight / size.y : 1;
    obj.scale.setScalar(scale);
    obj.position.y -= 0.04;

    return obj;
  }, [baseObj, modelMaterial]);

  return (
    <group ref={groupRef} position={[0, 0.1, 0]}>
      <mesh position={[0, 0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.7, 0.028, 24, 84]} />
        <meshPhysicalMaterial
          color="#D4AF37"
          roughness={0.07}
          metalness={1}
          clearcoat={1}
          clearcoatRoughness={0.04}
          envMapIntensity={2.5}
        />
      </mesh>

      <primitive object={model} />
    </group>
  );
}

function OrbitalArcs() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.2;
    groupRef.current.rotation.z = Math.sin(t * 0.4) * 0.18;
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.05, 0.01, 12, 120]} />
        <meshStandardMaterial color="#d7ba68" emissive="#6a4f10" emissiveIntensity={0.35} />
      </mesh>
      <mesh rotation={[0.3, Math.PI / 3, 0]}>
        <torusGeometry args={[1.2, 0.008, 12, 110]} />
        <meshStandardMaterial color="#f3d47b" emissive="#5b4510" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function SceneRig() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.x = 0;
    groupRef.current.rotation.z = 0;
    groupRef.current.rotation.y = t * 0.28;
    groupRef.current.position.y = Math.sin(t * 0.9) * 0.05;
  });

  return (
    <group ref={groupRef}>
      <OrbitalArcs />
      <LogoPendantMesh />
    </group>
  );
}

export function HeroPendant() {
  return (
    <section className="relative isolate overflow-hidden border-b border-[#D4AF37]/25 pt-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(212,175,55,0.24),transparent_34%),radial-gradient(circle_at_90%_15%,rgba(212,175,55,0.16),transparent_30%),radial-gradient(circle_at_50%_95%,rgba(212,175,55,0.11),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(10,10,10,0.64),rgba(10,10,10,0.26)_45%,rgba(10,10,10,0.62))]" />

      <div className="mx-auto grid min-h-[84vh] w-full max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-stretch md:px-8 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 flex h-full flex-col justify-center rounded-3xl border border-[#D4AF37]/20 bg-[linear-gradient(145deg,rgba(34,34,34,0.55),rgba(12,12,12,0.35))] p-5 md:p-6"
        >
          <h1 className="max-w-2xl text-5xl leading-[0.88] text-zinc-100 md:text-7xl">
            Metalin yeni dili.
            <span className="mt-2 block bg-gradient-to-r from-[#d4af37] via-[#f3d47b] to-[#b88f21] bg-clip-text text-transparent">
              Işıkla yaşayan formlar.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base text-zinc-300 md:text-lg">
            Oar & Ore, mimari çizgileri lüks yüzeyle buluşturan özel üretim pirinç takılar tasarlar.
            Her parça elde sonlandırılır, her kıvrım ışıkla derinleşir.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-7 py-3 text-sm font-semibold tracking-wide text-black transition hover:bg-transparent hover:text-[#D4AF37]"
            >
              Koleksiyonu Keşfet
            </Link>
            <Link
              href="/#nasil-calisiyoruz"
              className="inline-flex items-center justify-center rounded-lg border border-[#D4AF37]/40 bg-black/35 px-7 py-3 text-sm font-semibold tracking-wide text-[#f3d47b] transition hover:border-[#D4AF37] hover:bg-[#D4AF37]/10"
            >
              Nasıl Çalışıyoruz
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative min-h-[440px] overflow-hidden rounded-3xl border border-[#D4AF37]/35 bg-black/22 shadow-[0_0_80px_rgba(212,175,55,0.2)] md:h-full"
        >
          <Image
            src="/logo.png"
            alt="Oar & Ore hero görseli"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover opacity-[0.08]"
            priority
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(212,175,55,0.24),transparent_45%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(140deg,transparent_38%,rgba(212,175,55,0.2)_60%,transparent_82%)] opacity-60" />

          <Canvas camera={{ position: [0, 0.28, 3.1], fov: 36 }}>
            <ambientLight intensity={0.45} />
            <directionalLight position={[2.4, 3.8, 2.8]} intensity={1.9} color="#fff8de" />
            <pointLight position={[-2.1, -1.5, 1.2]} intensity={16} color="#ffd87a" />
            <spotLight position={[0, 3.5, 3.5]} intensity={45} angle={0.28} penumbra={0.95} />

            <SceneRig />
            <Sparkles count={72} scale={[3.6, 2.4, 2.8]} size={2.2} speed={0.35} color="#f3d47b" />
            <ContactShadows position={[0, -1.1, 0]} scale={4.2} opacity={0.36} blur={2.6} far={2.4} />
            <Environment preset="city" />
          </Canvas>
        </motion.div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-8 md:px-8 md:pb-12">
        <div className="flex gap-3 overflow-x-auto rounded-2xl border border-[#D4AF37]/28 bg-black/30 p-3 md:p-4">
          {trustItems.map((item) => (
            <div
              key={item}
              className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-[#D4AF37]/20 bg-[linear-gradient(145deg,rgba(22,22,22,0.85),rgba(8,8,8,0.9))] px-3 py-2.5"
            >
              <span className="rounded-full border border-[#D4AF37]/45 bg-[#D4AF37]/12 p-1 text-[#F3D47B]">
                <ShieldIcon />
              </span>
              <p className="text-xs tracking-[0.06em] text-zinc-200">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
