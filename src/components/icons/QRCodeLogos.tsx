import { Stack, useTheme } from '@avalabs/k2-components';
import { ReactNode } from 'react';

const innerCirclToOuterCircleRatio = 49.5 / 63;

interface QRCodeLogoProps {
  size?: number;
  className?: string;
}

interface QRCodeLogoContainerProps extends QRCodeLogoProps {
  children: ReactNode;
}

const QRCodeLogoContainer = ({
  size = 63,
  className,
  children,
}: QRCodeLogoContainerProps) => {
  const theme = useTheme();
  const innerCircleSize = Math.floor(size * innerCirclToOuterCircleRatio);
  return (
    <Stack
      className={className}
      sx={{
        position: 'absolute',
        borderRadius: '50%',
        backgroundColor: theme.palette.common.white,
        width: size,
        height: size,
        padding: 0.5,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={innerCircleSize}
        height={innerCircleSize}
        viewBox="0 0 105 105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {children}
      </svg>
    </Stack>
  );
};

export const BtcQRCodeLogo = ({ size, className }: QRCodeLogoProps) => (
  <QRCodeLogoContainer size={size} className={className}>
    <path
      d="M103.369 64.6552C96.4241 92.5126 68.209 109.466 40.3483 102.519C12.4993 95.5744 -4.45418 67.3576 2.49385 39.5024C9.43577 11.642 37.6508 -5.31279 65.5029 1.63219C93.3616 8.57716 110.314 36.797 103.368 64.6557L103.369 64.6552H103.369Z"
      fill="black"
    />
    <path
      d="M75.9363 44.5914C76.9713 37.6714 71.7028 33.9516 64.4986 31.4701L66.8357 22.0963L61.1296 20.6744L58.8545 29.8015C57.3544 29.4273 55.8138 29.0748 54.2827 28.7253L56.5743 19.538L50.8717 18.1162L48.5333 27.487C47.292 27.2044 46.0727 26.925 44.8898 26.6307L44.8964 26.6012L37.0275 24.6362L35.5096 30.7307C35.5096 30.7307 39.7431 31.7012 39.6539 31.7609C41.9645 32.3376 42.3824 33.8672 42.313 35.0796L39.6508 45.7586C39.8099 45.799 40.0163 45.8575 40.2441 45.949C40.0537 45.9017 39.8511 45.8501 39.6409 45.7998L35.9094 60.7595C35.627 61.4616 34.9103 62.5151 33.2948 62.115C33.3519 62.1979 29.1474 61.08 29.1474 61.08L26.3145 67.6117L33.7401 69.4629C35.1215 69.8093 36.4752 70.1717 37.8083 70.5126L35.4471 79.9939L41.1466 81.4158L43.485 72.0351C45.042 72.4578 46.5531 72.8477 48.0324 73.2152L45.7019 82.5517L51.4083 83.9735L53.7693 74.5099C63.4994 76.3514 70.8158 75.609 73.8953 66.808C76.3768 59.7223 73.7718 55.6352 68.6528 52.9699C72.3812 52.1101 75.1896 49.6578 75.9383 44.5922L75.9366 44.5909L75.9363 44.5914ZM62.8991 62.873C61.1357 69.9588 49.2054 66.1284 45.3374 65.1679L48.4708 52.6067C52.3385 53.5723 64.7421 55.4832 62.8994 62.873H62.8991ZM64.6638 44.4888C63.0552 50.934 53.1255 47.6595 49.9043 46.8566L52.7452 35.4644C55.9663 36.2673 66.3396 37.7659 64.6643 44.4888H64.6638Z"
      fill="white"
    />
  </QRCodeLogoContainer>
);

export const AvalancheQRCodeLogo = ({ size, className }: QRCodeLogoProps) => (
  <QRCodeLogoContainer size={size} className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M104 52C104 80.7188 80.7188 104 52 104C23.2812 104 0 80.7188 0 52C0 23.2812 23.2812 0 52 0C80.7188 0 104 23.2812 104 52ZM37.2648 72.6923H27.1731C25.0526 72.6923 24.005 72.6923 23.3662 72.2835C22.6765 71.8363 22.2549 71.0955 22.2038 70.278C22.1655 69.5242 22.6892 68.6045 23.7368 66.7649L48.6545 22.844C49.7147 20.9789 50.2513 20.0464 50.9283 19.7015C51.6565 19.3311 52.5251 19.3311 53.2533 19.7015C53.9303 20.0464 54.4669 20.9789 55.5272 22.844L60.6497 31.7861L60.6759 31.8317C61.821 33.8326 62.4018 34.8472 62.6553 35.9121C62.9362 37.0746 62.9362 38.3009 62.6553 39.4634C62.3998 40.5365 61.8249 41.5585 60.6624 43.5897L47.5738 66.7267L47.5399 66.786C46.3871 68.8033 45.8029 69.8256 44.9933 70.5974C44.1119 71.4404 43.0517 72.0535 41.8892 72.3985C40.8289 72.6923 39.6409 72.6923 37.2648 72.6923ZM62.7498 72.6934H77.2104C79.3438 72.6934 80.4168 72.6934 81.0555 72.272C81.7453 71.8248 82.1796 71.0711 82.218 70.2535C82.255 69.5247 81.7426 68.6405 80.7384 66.908C80.7042 66.8489 80.6693 66.7889 80.6339 66.7278L73.3909 54.3367L73.3084 54.1973C72.2906 52.476 71.7766 51.6068 71.117 51.2709C70.3889 50.9004 69.5331 50.9004 68.8049 51.2709C68.1406 51.6157 67.604 52.5227 66.5438 54.3494L59.3263 66.7405L59.3015 66.7833C58.245 68.607 57.7169 69.5185 57.755 70.2664C57.8062 71.0839 58.2276 71.8376 58.9175 72.2847C59.5435 72.6934 60.6164 72.6934 62.7498 72.6934Z"
      fill="black"
    />
  </QRCodeLogoContainer>
);
export const EthereumQRCodeLogo = ({ size, className }: QRCodeLogoProps) => (
  <QRCodeLogoContainer size={size} className={className}>
    <path
      d="M52 104C80.7188 104 104 80.7188 104 52C104 23.2812 80.7188 0 52 0C23.2812 0 0 23.2812 0 52C0 80.7188 23.2812 104 52 104Z"
      fill="black"
    />
    <path
      d="M52.5711 10.9297L26.9902 53.3796L52.5711 41.7528V10.9297Z"
      fill="#E8E8EB"
    />
    <path
      d="M52.574 41.7515L26.9932 53.3783L52.574 68.503V41.7515Z"
      fill="#949497"
    />
    <path
      d="M78.1725 53.3796L52.5869 10.9297V41.7528L78.1725 53.3796Z"
      fill="#949497"
    />
    <path
      d="M52.5869 68.503L78.1725 53.3783L52.5869 41.7515V68.503Z"
      fill="#3A3A3C"
    />
    <path
      d="M26.9932 58.2466L52.574 94.2977V73.3619L26.9932 58.2466Z"
      fill="#E8E8EB"
    />
    <path
      d="M52.5869 73.3619V94.2977L78.1867 58.2466L52.5869 73.3619Z"
      fill="#949497"
    />
  </QRCodeLogoContainer>
);