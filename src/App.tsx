import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import {
  OrbitControls,
  Extrude,
  Stage,
  Html,
  useProgress,
} from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three-stdlib";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";

function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress} % loaded</Html>;
}

function Svg({ url }: { url: string }) {
  const { paths } = useLoader(SVGLoader, url, (e) => console.log(e));
  const ref = useRef() as React.MutableRefObject<THREE.Group>;
  const [loaded, setLoaded] = useState(false);

  useFrame(() => {
    if (!loaded && ref.current) {
      ref.current.scale.y *= -1;
      ref.current.position.y = 0;
      setLoaded(true);
    }
  });

  const shapes = useMemo(
    () =>
      paths.flatMap((p) =>
        SVGLoader.createShapes(p).map((shape) => {
          return {
            shape,
            color: p.color,
            fillOpacity: p.userData?.style.fillOpacity,
            fill: p.userData?.style.fill,
            stroke: p.userData?.style.stroke,
            id: p.userData?.node.id,
          };
        })
      ),
    [paths]
  );

  const extrudeSettings = useMemo(
    () => ({
      depth: 20,
      bevelThickness: 0,
      bevelSize: 0,
      bevelOffset: 0,
      bevelSegments: 2,
      bevelEnabled: false,
    }),
    []
  );

  return (
    <>
      <ambientLight intensity={0.8} />
      <spotLight
        position={[80, 120, -5]}
        intensity={0.7}
        args={[0xffffff]}
        castShadow
      />
      <OrbitControls />
      <Suspense fallback={<Loader />}>
        <Stage environment="sunset" preset="rembrandt" intensity={0.5}>
          <group ref={ref}>
            {shapes.map((shape, i) => (
              <Extrude
                key={`${shape.id}${i}`}
                args={[shape.shape, extrudeSettings]}
                receiveShadow
              >
                <meshStandardMaterial
                  color={new THREE.Color()
                    .setStyle(shape.fill)
                    .convertSRGBToLinear()}
                  opacity={shape.fillOpacity}
                  depthWrite={false}
                  transparent
                  side={THREE.DoubleSide}
                />
              </Extrude>
            ))}
          </group>
        </Stage>
      </Suspense>
      <Html
        fullscreen
        style={{
          padding: "32px",
        }}
      >
        <button
          className="border border-black px-2 py-1.5 block mt-2"
          onClick={() => {
            const exporter = new GLTFExporter();

            exporter.parse(
              ref.current!,
              (gltf) => {
                const output = JSON.stringify(gltf, null, 2);
                const link = document.createElement("a");
                link.href = URL.createObjectURL(
                  new Blob([output], {
                    type: "text/plain",
                  })
                );

                link.download = "scene.gltf";
                link.click();
              },
              function (error) {
                console.log("An error happened during parsing", error);
              }
            );
          }}
        >
          Export
        </button>
      </Html>
    </>
  );
}

const App = () => {
  const [file, setFile] = useState<string | ArrayBuffer | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (files) {
      for (let img of Array.from(files)) {
        const fileReader = new FileReader();

        fileReader.readAsDataURL(img);
        fileReader.onload = function () {
          setFile(fileReader.result);
        };
      }
    }
  };

  return (
    <div className="flex">
      <div className="basis-24">
        <input type="file" accept="image/svg+xml" onChange={onChange} />
      </div>
      <div className="h-screen flex-1 relative">
        <Canvas
          camera={{
            near: 0.1,
            far: 1000,
            zoom: 1,
          }}
          onCreated={({ gl }) => {
            gl.setClearColor("#f8f9fd");
          }}
        >
          {file ? <Svg url={file as string} /> : null}
        </Canvas>
      </div>
    </div>
  );
};

export default App;
