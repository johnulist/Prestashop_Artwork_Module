<?php
class SimulacionDisplayModuleFrontController extends ModuleFrontController
{
    protected $product;
    public function init()
    {
        parent::init();

        if ($id_product = (int)Tools::getValue('id_product'))
            $this->product = new Product($id_product, true, $this->context->language->id, $this->context->shop->id);

        if (!Validate::isLoadedObject($this->product))
        {
            echo 'Product not found';
            exit;
        }
    }

    public function initContent()
    {
        parent::initContent();
        //Saving product customize
        if ($_SERVER['REQUEST_METHOD'] == 'POST') {
            if ((int)Tools::getValue('upload') == 1) {
//                print_r($this->pictureUpload((int)Tools::getValue('img_width'), (int)Tools::getValue('img_heigth'))); exit;
                // If cart has not been saved, we need to do it so that customization fields can have an id_cart
                // We check that the cookie exists first to avoid ghost carts
                if (!$this->context->cart->id && isset($_COOKIE[$this->context->cookie->getName()])) {
                    $this->context->cart->add();
                    $this->context->cookie->id_cart = (int)$this->context->cart->id;
                }
                if($this->pictureUpload((int)Tools::getValue('img_width'), (int)Tools::getValue('img_heigth'))){
                    echo 'Save Completed';
                    exit;
                } else {
                    echo 'error';
                    exit;
                }
            } else if ((int)Tools::getValue('upload') == 2) {
                if($report = $this->pictureUpload((int)Tools::getValue('img_width'), (int)Tools::getValue('img_heigth'))){
                    print_r($report);
                    exit;
                } else {
                    echo $report;
                    exit;
                }
            }
        }
    }

    /**
     * @param $width
     * @param $heigth
     * @return bool|string
     * Override function from Front Product Controller
     */
    protected function pictureUpload($width, $heigth)
    {
        if (!$field_ids = $this->product->getCustomizationFieldIds())
            return false;

        $authorized_file_fields = array();
        foreach ($field_ids as $field_id) {
            if ($field_id['type'] == Product::CUSTOMIZE_FILE){
                $authorized_file_fields[(int)$field_id['id_customization_field']] = 'file'.(int)$field_id['id_customization_field'];
            }
        }

        $indexes = array_flip($authorized_file_fields);
        return $_FILES;
        foreach ($_FILES as $field_name => $file) {
            if(isset($file['tmp_name']) && !empty($file['tmp_name'])) {
                if (in_array($field_name, $authorized_file_fields))
                {
                    $file_name = md5(uniqid(rand(), true));

                    $product_picture_width = (int)Configuration::get('PS_PRODUCT_PICTURE_WIDTH');
                    $product_picture_height = (int)Configuration::get('PS_PRODUCT_PICTURE_HEIGHT');
                    $tmp_name = tempnam(_PS_TMP_IMG_DIR_, 'PS');
                    if (!$tmp_name || !move_uploaded_file($file['tmp_name'], $tmp_name))
                        return 'Can not upload file';

                    if (!ImageManager::resize($tmp_name, _PS_UPLOAD_DIR_.$file_name)){
                        return 'An error occurred during the image upload process.';
                    }
                    elseif (!ImageManager::resize($tmp_name, _PS_UPLOAD_DIR_.$file_name.'_small', 150, 150)){
                        return 'An error occurred during the image upload process.';
                    }
                    elseif (!chmod(_PS_UPLOAD_DIR_.$file_name, 0777) || !chmod(_PS_UPLOAD_DIR_.$file_name.'_small', 0777)){
                        return 'An error occurred during the image upload process.';
                    }
                    else
                        $this->context->cart->addPictureToProduct($this->product->id, $indexes[$field_name], Product::CUSTOMIZE_FILE, $file_name);
                } else if($field_name == 'simulation_image') {
                    $file_name = md5(uniqid(rand(), true).$this->product->id.time().$field_name);
                    $tmp_name = tempnam(_PS_TMP_IMG_DIR_, 'PS');

                    if (!$tmp_name || !move_uploaded_file($file['tmp_name'], $tmp_name))
                        return 'Can not upload file';

//                    if (!$this->resize($tmp_name, _PS_UPLOAD_DIR_.$file_name, $width, $heigth)){
                    if (!ImageManager::resize($tmp_name, _PS_UPLOAD_DIR_.$file_name)){
                        return 'An error occurred during the image upload process.';
                    }
                    elseif (!ImageManager::resize($tmp_name, _PS_UPLOAD_DIR_.$file_name.'_small', 150, 150)){
                        return 'An error occurred during the image upload process.';
                    }
                    elseif (!chmod(_PS_UPLOAD_DIR_.$file_name, 0777) || !chmod(_PS_UPLOAD_DIR_.$file_name.'_small', 0777)){
                        return 'An error occurred during the image upload process.';
                    } else {
                        //if(!$this->saveImage($this->context->cart->id, $this->product->id, $file_name)) return 'Update Error';
                    }
                }
                unlink($tmp_name);
            }
        }
        return true;
    }

    /**
     * @param $src_file
     * @param $dst_file
     * @param null $dst_width
     * @param null $dst_height
     * @param string $file_type
     * @param bool $force_type
     * @return bool
     * Override function from Image Manager class
     */
    protected function resize($src_file, $dst_file, $dst_width = null, $dst_height = null, $file_type = 'jpg', $force_type = false)
    {
        if (PHP_VERSION_ID < 50300)
            clearstatcache();
        else
            clearstatcache(true, $src_file);

        if (!file_exists($src_file) || !filesize($src_file))
            return false;
        list($src_width, $src_height, $type) = getimagesize($src_file);

        // If PS_IMAGE_QUALITY is activated, the generated image will be a PNG with .jpg as a file extension.
        // This allow for higher quality and for transparency. JPG source files will also benefit from a higher quality
        // because JPG reencoding by GD, even with max quality setting, degrades the image.
        if (Configuration::get('PS_IMAGE_QUALITY') == 'png_all' || (Configuration::get('PS_IMAGE_QUALITY') == 'png' && $type == IMAGETYPE_PNG) && !$force_type)
            $file_type = 'png';

        if (!$src_width)
            return false;
        if (!$dst_width)
            $dst_width = $src_width;
        if (!$dst_height)
            $dst_height = $src_height;

        $width_diff = $dst_width / $src_width;
        $height_diff = $dst_height / $src_height;

        if ($width_diff > 1 && $height_diff > 1)
        {
            $next_width = $src_width;
            $next_height = $src_height;
        }
        else
        {
            if (Configuration::get('PS_IMAGE_GENERATION_METHOD') == 2 || (!Configuration::get('PS_IMAGE_GENERATION_METHOD') && $width_diff > $height_diff))
            {
                $next_height = $dst_height;
                $next_width = round(($src_width / $src_height) * $next_height);
                $dst_width = (int)(!Configuration::get('PS_IMAGE_GENERATION_METHOD') ? $dst_width : $next_width);
            }
            else
            {
                $next_width = $dst_width;
                $next_height = round(($src_height / $src_width) * $next_width);
                $dst_height = (int)(!Configuration::get('PS_IMAGE_GENERATION_METHOD') ? $dst_height : $next_height);
            }
        }

        if (!ImageManager::checkImageMemoryLimit($src_file))
            return false;

        $dest_image = imagecreatetruecolor($dst_width, $dst_height);
        $src_image = ImageManager::create($type, $src_file);

        imagecopyresampled($dest_image, $src_image, 0, 0, 0, 0, $dst_width, $dst_height, $src_width, $src_height);
        return (ImageManager::write($file_type, $dest_image, $dst_file));
    }

    protected function saveImage($cart_id, $product_id, $filename) {
        //Check if image has insert
        $image = Db::getInstance()->getRow('SELECT id FROM ' . _DB_PREFIX_ . 'simulacion_image WHERE cart_id = ' . (int)$cart_id);

        if($image) {
            //Update new image
            if (Db::getInstance()->update('simulacion_image', array('cart_id' => $cart_id, 'product_id' => $product_id, 'file' => $filename), 'id = '.(int)$image['id'])) return true;
            else return false;
        } else {
            //Insert new image
            if(Db::getInstance()->insert('simulacion_image', array('cart_id' => $cart_id, 'product_id' => $product_id,
                                                                'file'      => $filename))) return true;
            else return false;
        }
    }
}
