import { type FC } from 'react'

export const NessTag: FC = ({ ...props }) => {
  return (
    <svg
      width="101"
      height="56"
      viewBox="0 0 101 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g filter="url(#filter0_dd_2859_5300)">
        <rect
          x="11.6504"
          y="6.56763"
          width="76"
          height="28"
          rx="8"
          transform="rotate(-3.82708 11.6504 6.56763)"
          fill="#0B0C0E"
          shapeRendering="geometricPrecision"
        />
        <text
          x="50"
          y="22"
          textAnchor="middle"
          fontSize="14"
          fontWeight="500"
          fill="#EEF1F6"
          fontFamily="Montserrat, sans-serif"
        >
          ness<span style={{ fill: '#00ADE8' }}>.</span>
        </text>
      </g>
      <defs>
        <filter
          id="filter0_dd_2859_5300"
          x="-0.349609"
          y="-0.505127"
          width="101.699"
          height="57.0103"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_2859_5300"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="2" />
          <feGaussianBlur stdDeviation="1" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
          />
          <feBlend
            mode="normal"
            in2="effect1_dropShadow_2859_5300"
            result="effect2_dropShadow_2859_5300"
          />
        </filter>
      </defs>
    </svg>
  )
}
