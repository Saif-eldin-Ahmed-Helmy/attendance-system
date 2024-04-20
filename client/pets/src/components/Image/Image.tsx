import Image from 'react-bootstrap/Image';
import './Image.css';
import React from "react";

interface ImageProps {
    src: string;
    className?: string;
    alt?: string;
    fluid?: boolean;
}

const ImageComponent: React.FC<ImageProps> = ({ src, className, alt, fluid }) => {
    return <Image className={className} src={src} alt={alt} fluid={fluid}/>;
}

export default ImageComponent;